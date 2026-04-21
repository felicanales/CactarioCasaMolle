"""
Rate limiting middleware for authentication endpoints
"""
from typing import Dict, Tuple
from datetime import datetime, timedelta
from fastapi import Request, HTTPException, status
from collections import defaultdict
import threading

# Máximo de IPs distintas a rastrear simultáneamente (evita memory leak con IPs únicas)
_MAX_TRACKED_IPS = 10_000

_rate_limit_store: Dict[str, list] = defaultdict(list)
_rate_limit_lock = threading.Lock()


def check_rate_limit(request: Request, limit: int, window_seconds: int) -> Tuple[bool, int]:
    """
    Check if request is within rate limit.
    Purga entradas vacías para evitar memory leak con IPs únicas.
    """
    now = datetime.now()
    client_ip = request.client.host if request.client else "unknown"

    with _rate_limit_lock:
        # Purgar IPs en exceso si el dict creció demasiado (FIFO simple)
        if len(_rate_limit_store) > _MAX_TRACKED_IPS:
            oldest_keys = list(_rate_limit_store.keys())[:len(_rate_limit_store) - _MAX_TRACKED_IPS]
            for key in oldest_keys:
                del _rate_limit_store[key]

        cutoff_time = now - timedelta(seconds=window_seconds)
        client_requests = [t for t in _rate_limit_store[client_ip] if t > cutoff_time]

        if len(client_requests) >= limit:
            oldest_request = min(client_requests)
            time_remaining = int((oldest_request + timedelta(seconds=window_seconds) - now).total_seconds())
            # Actualizar sin la entrada actual (ya descartamos la anterior)
            _rate_limit_store[client_ip] = client_requests
            return False, max(0, time_remaining)

        client_requests.append(now)

        # Purgar entrada si quedó vacía (libera memoria de IPs inactivas)
        if client_requests:
            _rate_limit_store[client_ip] = client_requests
        elif client_ip in _rate_limit_store:
            del _rate_limit_store[client_ip]

        if len(client_requests) > 1:
            oldest_request = min(client_requests)
            time_remaining = int((oldest_request + timedelta(seconds=window_seconds) - now).total_seconds())
        else:
            time_remaining = window_seconds

        return True, time_remaining


def rate_limit_decorator(limit: int, window_seconds: int):
    """
    Decorator to apply rate limiting to an endpoint
    """
    def decorator(func):
        async def wrapper(request: Request, *args, **kwargs):
            is_allowed, time_remaining = check_rate_limit(request, limit, window_seconds)
            
            if not is_allowed:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Demasiadas peticiones. Intenta nuevamente en {time_remaining} segundos.",
                    headers={"Retry-After": str(time_remaining)}
                )
            
            return await func(request, *args, **kwargs)
        return wrapper
    return decorator

