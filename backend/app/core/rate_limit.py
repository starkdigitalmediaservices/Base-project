"""In-memory sliding-window rate limiter.

Used to throttle login attempts per email address (no external dependency required).
For multi-process or multi-server deployments, replace the in-memory store with Redis.
"""

import threading
import time
from collections import deque


class SlidingWindowRateLimiter:
    """Thread-safe, process-local sliding-window rate limiter.

    Each *key* (e.g. a normalised email) is tracked independently.  An attempt
    is counted before the upstream work is tried; the caller is responsible for
    removing the key on success if desired (``reset``).

    Not suitable for multi-process deployments without a shared backing store.
    """

    def __init__(self, max_attempts: int, window_seconds: int) -> None:
        if max_attempts < 1:
            raise ValueError("max_attempts must be >= 1")
        if window_seconds < 1:
            raise ValueError("window_seconds must be >= 1")
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self._lock = threading.Lock()
        self._windows: dict[str, deque[float]] = {}

    def is_allowed(self, key: str) -> bool:
        """Return ``True`` and record the attempt if within the limit.

        Returns ``False`` without recording when the limit is already reached.
        """
        now = time.monotonic()
        cutoff = now - self.window_seconds
        with self._lock:
            window = self._windows.setdefault(key, deque())
            # Drop attempts older than the window.
            while window and window[0] < cutoff:
                window.popleft()
            if len(window) >= self.max_attempts:
                return False
            window.append(now)
            return True

    def reset(self, key: str) -> None:
        """Clear the recorded attempts for *key* (call after a successful login)."""
        with self._lock:
            self._windows.pop(key, None)

    def remaining(self, key: str) -> int:
        """Number of attempts still available for *key* in the current window."""
        now = time.monotonic()
        cutoff = now - self.window_seconds
        with self._lock:
            window = self._windows.get(key)
            if window is None:
                return self.max_attempts
            count = sum(1 for t in window if t >= cutoff)
            return max(0, self.max_attempts - count)


# Module-level singleton: 10 attempts per 5-minute window per email.
# Settings values are read at import time; override LOGIN_RATE_LIMIT_* in .env to change.
login_rate_limiter: SlidingWindowRateLimiter | None = None


def get_login_rate_limiter() -> SlidingWindowRateLimiter:
    """Lazy singleton so tests can swap it before the first import cycle completes."""
    global login_rate_limiter
    if login_rate_limiter is None:
        from app.core.config import settings  # avoid circular import at module level

        login_rate_limiter = SlidingWindowRateLimiter(
            max_attempts=settings.login_rate_limit_max_attempts,
            window_seconds=settings.login_rate_limit_window_seconds,
        )
    return login_rate_limiter
