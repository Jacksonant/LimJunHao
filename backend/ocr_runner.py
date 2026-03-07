from __future__ import annotations

import base64
import os
import tempfile
import threading
import time
import uuid
import traceback
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

_ocr_cache: Dict[str, Any] = {}
_ocr_lock = threading.Lock()
_jobs_lock = threading.Lock()
_ocr_jobs: Dict[str, Dict[str, Any]] = {}

# Improve CPU runtime compatibility for PaddleOCR on some Linux setups.
os.environ.setdefault("FLAGS_enable_pir_api", "0")
os.environ.setdefault("FLAGS_use_mkldnn", "0")
os.environ.setdefault("PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK", "True")


def _get_ocr(lang: str, emit: Optional[Callable[[str], None]] = None):
    try:
        from paddleocr import PaddleOCR
    except Exception as exc:
        raise RuntimeError(
            "PaddleOCR is not installed. Install with: pip install paddleocr and a matching paddlepaddle build."
        ) from exc

    with _ocr_lock:
        if lang in _ocr_cache:
            if emit:
                emit("DEBUG stage=model_init cache_hit=true")
            return _ocr_cache[lang]

        if emit:
            emit("INFO stage=model_init cache_hit=false action=load_model")
        ocr = PaddleOCR(
            use_angle_cls=True,
            lang=lang,
            enable_mkldnn=False,
            cpu_threads=1,
        )
        _ocr_cache[lang] = ocr
        return ocr


def _parse_output(result: Any) -> List[Dict[str, Any]]:
    lines: List[Dict[str, Any]] = []

    if not isinstance(result, list):
        return lines

    # PaddleOCR v3 style: list[OCRResult]
    # OCRResult behaves like dict with rec_texts/rec_scores/rec_polys.
    if len(result) > 0 and not isinstance(result[0], list):
      for item in result:
            try:
                payload = dict(item)
            except Exception:
                payload = {}

            texts = payload.get("rec_texts") or []
            scores = payload.get("rec_scores") or []
            polys = payload.get("rec_polys") or payload.get("dt_polys") or []

            count = max(len(texts), len(scores), len(polys))
            for i in range(count):
                text = str(texts[i]) if i < len(texts) else ""
                if not text:
                    continue
                try:
                    confidence = float(scores[i]) if i < len(scores) else 0.0
                except Exception:
                    confidence = 0.0
                box = polys[i] if i < len(polys) else []
                lines.append(
                    {
                        "text": text,
                        "confidence": confidence,
                        "box": box,
                    }
                )
      return lines

    # PaddleOCR v2 style: list[list[[box, [text, conf]]]]
    for page in result:
        if not isinstance(page, list):
            continue
        for item in page:
            if not isinstance(item, list) or len(item) < 2:
                continue
            box = item[0]
            text_conf = item[1]
            if not isinstance(text_conf, (list, tuple)) or len(text_conf) < 2:
                continue

            text = str(text_conf[0])
            try:
                confidence = float(text_conf[1])
            except Exception:
                confidence = 0.0

            lines.append(
                {
                    "text": text,
                    "confidence": confidence,
                    "box": box,
                }
            )

    return lines


def _to_builtin(value: Any) -> Any:
    # FastAPI JSON encoding fails on numpy scalar/array types; normalize deeply.
    if isinstance(value, dict):
        return {str(_to_builtin(k)): _to_builtin(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_to_builtin(v) for v in value]
    if isinstance(value, tuple):
        return [_to_builtin(v) for v in value]
    if hasattr(value, "tolist"):
        try:
            return _to_builtin(value.tolist())
        except Exception:
            pass
    if hasattr(value, "item"):
        try:
            return value.item()
        except Exception:
            pass
    return value


def run_ocr_pipeline(
    image_base64: str,
    lang: str = "en",
    log_hook: Optional[Callable[[str], None]] = None,
) -> Dict[str, Any]:
    logs: List[str] = []
    pipeline_started = time.perf_counter()

    def emit(message: str):
        ts = datetime.now(timezone.utc).isoformat()
        elapsed_ms = int((time.perf_counter() - pipeline_started) * 1000)
        line = f"[{ts}] +{elapsed_ms}ms {message}"
        logs.append(line)
        if log_hook:
            log_hook(line)

    emit("INFO stage=pipeline status=start")
    emit("INFO stage=decode action=read_input_base64")

    if not image_base64:
        emit("ERROR stage=decode reason=empty_image_base64")
        raise ValueError("image_base64 is required")

    if "," in image_base64:
        image_base64 = image_base64.split(",", 1)[1]

    try:
        image_bytes = base64.b64decode(image_base64)
    except Exception as exc:
        emit(f"ERROR stage=decode reason=invalid_base64 detail={exc}")
        raise ValueError("Invalid base64 payload") from exc

    emit(f"INFO stage=decode status=ok bytes={len(image_bytes)}")

    suffix = ".png"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(image_bytes)
        tmp_path = Path(tmp.name)

    emit(f"INFO stage=prepare_file status=ok path={tmp_path}")

    try:
        emit(f"INFO stage=model_init action=begin lang={lang}")
        ocr = _get_ocr(lang, emit=emit)
        emit("INFO stage=model_init status=ready")

        emit("INFO stage=inference action=begin")
        inference_start = time.perf_counter()
        try:
            # Old PaddleOCR API
            result = ocr.ocr(str(tmp_path), cls=True)
            emit(f"INFO stage=inference api=v2_with_cls status=ok duration_ms={int((time.perf_counter() - inference_start) * 1000)}")
        except TypeError as exc:
            # New PaddleOCR API (predict kwargs no longer support `cls`)
            if "unexpected keyword argument 'cls'" not in str(exc):
                raise
            emit("WARN stage=inference api=v3_no_cls fallback=true")
            result = ocr.ocr(str(tmp_path))
            emit(f"INFO stage=inference api=v3_no_cls status=ok duration_ms={int((time.perf_counter() - inference_start) * 1000)}")
        except Exception as retry_exc:
            # First-run model bootstrap can be flaky; one retry improves stability.
            emit(f"WARN stage=inference retry_once=true error={retry_exc}")
            time.sleep(1.0)
            inference_start = time.perf_counter()
            try:
                result = ocr.ocr(str(tmp_path), cls=True)
                emit(f"INFO stage=inference retry_result=ok api=v2_with_cls duration_ms={int((time.perf_counter() - inference_start) * 1000)}")
            except TypeError as exc:
                if "unexpected keyword argument 'cls'" not in str(exc):
                    raise
                emit("WARN stage=inference retry_fallback=v3_no_cls")
                result = ocr.ocr(str(tmp_path))
                emit(f"INFO stage=inference retry_result=ok api=v3_no_cls duration_ms={int((time.perf_counter() - inference_start) * 1000)}")

        emit("INFO stage=parse action=begin")
        lines = _to_builtin(_parse_output(result))
        emit(f"INFO stage=parse status=ok line_count={len(lines)}")

        extracted_text = "\n".join([ln["text"] for ln in lines])
        line_count = len(lines)
        avg_conf = (
            sum(ln["confidence"] for ln in lines) / line_count if line_count > 0 else 0.0
        )

        analysis = {
            "lineCount": line_count,
            "avgConfidence": round(avg_conf, 4),
            "highConfidenceLines": sum(1 for ln in lines if ln["confidence"] >= 0.9),
            "mediumConfidenceLines": sum(
                1 for ln in lines if 0.7 <= ln["confidence"] < 0.9
            ),
            "lowConfidenceLines": sum(1 for ln in lines if ln["confidence"] < 0.7),
        }

        emit(
            "INFO stage=analysis "
            f"line_count={analysis['lineCount']} avg_conf={analysis['avgConfidence']}"
        )
        emit("INFO stage=pipeline status=done")
        return {
            "logs": logs,
            "analysis": analysis,
            "result": {
                "text": extracted_text,
                "lines": lines,
            },
        }
    except Exception as exc:
        emit(f"ERROR stage=pipeline status=failed error={exc}")
        tb = traceback.format_exc().strip()
        if tb:
            for line in tb.splitlines():
                emit(f"TRACE {line}")
        raise
    finally:
        try:
            tmp_path.unlink(missing_ok=True)
            emit("DEBUG stage=cleanup temp_file_deleted=true")
        except Exception:
            emit("WARN stage=cleanup temp_file_deleted=false")
            pass


def start_ocr_job(image_base64: str, lang: str = "en") -> str:
    job_id = str(uuid.uuid4())
    with _jobs_lock:
        _ocr_jobs[job_id] = {
            "jobId": job_id,
            "status": "queued",
            "logs": [],
            "analysis": None,
            "result": None,
            "error": None,
        }

    def log_hook(message: str):
        with _jobs_lock:
            if job_id in _ocr_jobs:
                _ocr_jobs[job_id]["logs"].append(message)

    def worker():
        with _jobs_lock:
            if job_id in _ocr_jobs:
                _ocr_jobs[job_id]["status"] = "running"
        try:
            payload = run_ocr_pipeline(image_base64, lang, log_hook=log_hook)
            with _jobs_lock:
                if job_id in _ocr_jobs:
                    _ocr_jobs[job_id]["status"] = "done"
                    _ocr_jobs[job_id]["analysis"] = payload.get("analysis")
                    _ocr_jobs[job_id]["result"] = payload.get("result")
        except Exception as exc:
            with _jobs_lock:
                if job_id in _ocr_jobs:
                    _ocr_jobs[job_id]["status"] = "error"
                    _ocr_jobs[job_id]["error"] = str(exc)
                    _ocr_jobs[job_id]["logs"].append(
                        f"[{datetime.now(timezone.utc).isoformat()}] ERROR stage=job status=failed error={exc}"
                    )
                    tb = traceback.format_exc().strip()
                    if tb:
                        for line in tb.splitlines():
                            _ocr_jobs[job_id]["logs"].append(
                                f"[{datetime.now(timezone.utc).isoformat()}] TRACE {line}"
                            )

    t = threading.Thread(target=worker, daemon=True)
    t.start()
    return job_id


def get_ocr_job(job_id: str) -> Optional[Dict[str, Any]]:
    with _jobs_lock:
        job = _ocr_jobs.get(job_id)
        if job is None:
            return None
        return {
            "jobId": job["jobId"],
            "status": job["status"],
            "logs": list(job["logs"]),
            "analysis": job["analysis"],
            "result": job["result"],
            "error": job["error"],
        }
