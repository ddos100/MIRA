"""Thread-local middleware to make the current request/user available in signals."""

import threading

_thread_locals = threading.local()


def get_current_user():
    return getattr(_thread_locals, "user", None)


def get_current_request():
    return getattr(_thread_locals, "request", None)


def get_client_ip(request):
    if request is None:
        return None
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


class CurrentUserMiddleware:
    """Store the current request in thread-local storage for use in signals."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        _thread_locals.user = getattr(request, "user", None)
        _thread_locals.request = request
        try:
            response = self.get_response(request)
        finally:
            _thread_locals.user = None
            _thread_locals.request = None
        return response
