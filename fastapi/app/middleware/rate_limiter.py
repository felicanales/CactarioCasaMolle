"""
Rate limiting middleware for authentication endpoints
"""
from typing import Dict, Tuple
from datetime import datetime, timedelta
from fastapi import Request, HTTPException, status
from collections import defaultdict
import threading

# Store rate limit data: {remote_address: [(timestamp, count)]}
_rate_limit_store: Dict[str, list] = defaultdict(list)
_rate_limit_lock = threading.Lock()


def check_rate_limit(request: Request, limit: int, window_seconds: int) -> Tuple[bool, int]:
    """
    Check if request is within rate limit
    
    Args:
        request: FastAPI request object
        limit: Maximum number of requests allowed
        window_seconds: Time window in seconds
        
    Returns:
        Tuple of (is_allowed, time_remaining)
    """
    now = datetime.now()
    client_ip = request.client.host if request.client else "unknown"
    
    with _rate_limit_lock:
        # Clean old entries
        client_requests = _rate_limit_store[client_ip]
        cutoff_time = now - timedelta(seconds=window_seconds)
        client_requests = [req_time for req_time in client_requests if req_time > cutoff_time]
        
        # Check if limit exceeded
        if len(client_requests) >= limit:
            # Calculate time remaining until oldest request expires
            oldest_request = min(client_requests)
            time_remaining = int((oldest_request + timedelta(seconds=window_seconds) - now).total_seconds())
            return False, max(0, time_remaining)
        
        # Add current request
        client_requests.append(now)
        _rate_limit_store[client_ip] = client_requests
        
        # Calculate time remaining
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

