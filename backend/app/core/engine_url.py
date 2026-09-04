"""SSRF-safe URL handling for administrator-configured OCR engines.

Engine services are deliberately allowed on a self-hosted deployment's LAN,
including RFC1918, loopback, and internal-DNS addresses. The safeguards here
therefore target destinations that have no valid engine use case: cloud
metadata, link-local, unspecified, multicast, and reserved addresses.
"""

from __future__ import annotations

import asyncio
import ipaddress
import socket
from urllib.parse import urlsplit, urlunsplit


class EngineUrlSafetyError(ValueError):
    """Raised when an engine URL is malformed or unsafe to contact."""


_CLOUD_METADATA_HOSTS = frozenset({"metadata.google.internal"})
_ALIBABA_METADATA_ADDRESS = ipaddress.ip_address("100.100.100.200")
_AWS_IPV6_METADATA_ADDRESS = ipaddress.ip_address("fd00:ec2::254")


def normalise_engine_url(value: str) -> str:
    """Return a canonical engine base URL after static safety checks."""
    value = value.strip()
    try:
        parsed = urlsplit(value)
        port = parsed.port  # Accessing it validates the port range and syntax.
    except ValueError as exc:
        raise EngineUrlSafetyError("The engine URL has an invalid host or port.") from exc

    if parsed.scheme not in {"http", "https"}:
        raise EngineUrlSafetyError(
            "Use a full HTTP(S) URL, for example http://10.0.0.15:8101."
        )
    if not parsed.hostname:
        raise EngineUrlSafetyError("The engine URL must include a host name or IP address.")
    if parsed.username is not None or parsed.password is not None:
        raise EngineUrlSafetyError(
            "The engine URL must not include credentials; use the API key fields instead."
        )
    if parsed.query or parsed.fragment:
        raise EngineUrlSafetyError("The engine URL must not contain a query string or fragment.")
    host = parsed.hostname.rstrip(".")
    if host.lower() in _CLOUD_METADATA_HOSTS:
        raise EngineUrlSafetyError(
            "Cloud metadata endpoints are not allowed as OCR engine URLs."
        )
    _assert_safe_ip_literal(host)

    netloc = parsed.hostname
    if ":" in parsed.hostname and not parsed.hostname.startswith("["):
        netloc = f"[{parsed.hostname}]"
    if port is not None:
        netloc = f"{netloc}:{port}"
    path = parsed.path.rstrip("/")
    return urlunsplit((parsed.scheme.lower(), netloc, path, "", ""))


def _assert_safe_ip_literal(host: str) -> None:
    try:
        address = ipaddress.ip_address(host)
    except ValueError:
        return
    _assert_safe_address(address)


def _assert_safe_address(address: ipaddress.IPv4Address | ipaddress.IPv6Address) -> None:
    # IPv4-mapped IPv6 is semantically the underlying IPv4 destination.
    if isinstance(address, ipaddress.IPv6Address) and address.ipv4_mapped:
        _assert_safe_address(address.ipv4_mapped)
        return

    if address in {_ALIBABA_METADATA_ADDRESS, _AWS_IPV6_METADATA_ADDRESS}:
        raise EngineUrlSafetyError(
            "Cloud metadata endpoints are not allowed as OCR engine URLs."
        )
    if address.is_link_local:
        raise EngineUrlSafetyError(
            "Link-local addresses, including cloud metadata services, are not allowed."
        )
    if address.is_unspecified or address.is_multicast:
        raise EngineUrlSafetyError(
            "The engine URL resolves to an unspecified or multicast address."
        )
    # Preserve common self-hosted configurations: a local service, an RFC1918
    # LAN address, and IPv6 unique-local addresses are all valid destinations.
    if address.is_loopback or address.is_private:
        return
    if address.is_reserved:
        raise EngineUrlSafetyError("The engine URL resolves to a reserved address.")


def _resolve_host_addresses(host: str, port: int) -> set[ipaddress.IPv4Address | ipaddress.IPv6Address]:
    records = socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
    addresses: set[ipaddress.IPv4Address | ipaddress.IPv6Address] = set()
    for _, _, _, _, sockaddr in records:
        addresses.add(ipaddress.ip_address(sockaddr[0]))
    return addresses


async def assert_safe_engine_url(value: str) -> str:
    """Normalise *value* and reject hostnames that resolve to unsafe IPs.

    DNS is checked every time a persisted engine is about to be contacted, so
    a configuration is not trusted indefinitely after a DNS change. LAN and
    loopback addresses remain permitted.
    """
    normalised = normalise_engine_url(value)
    parsed = urlsplit(normalised)
    assert parsed.hostname is not None
    port = parsed.port or (443 if parsed.scheme == "https" else 80)
    try:
        addresses = await asyncio.to_thread(_resolve_host_addresses, parsed.hostname, port)
    except (OSError, ValueError) as exc:
        raise EngineUrlSafetyError(
            "The engine host could not be resolved to a safe IP address."
        ) from exc
    if not addresses:
        raise EngineUrlSafetyError("The engine host did not resolve to an IP address.")
    for address in addresses:
        _assert_safe_address(address)
    return normalised
