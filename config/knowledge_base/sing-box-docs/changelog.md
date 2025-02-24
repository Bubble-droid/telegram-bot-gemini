#### 1.12.0-alpha.4

* Fixes and improvements

### 1.11.1

* Fixes and improvements

#### 1.12.0-alpha.2

* Update quic-go to v0.49.0
* Fixes and improvements

#### 1.12.0-alpha.1

* Refactor DNS servers **1**
* Add domain resolver options**2**
* Add TLS fragment route options **3**
* Add certificate options **4**

**1**:

DNS servers are refactored for better performance and scalability.

See [DNS server](/configuration/dns/server/).

For migration, see [Migrate to new DNS server formats](/migration/#migrate-to-new-dns-servers).

Compatibility for old formats will be removed in sing-box 1.14.0.

**2**:

Legacy `outbound` DNS rules are deprecated
and can be replaced by the new `domain_resolver` option.

See [Dial Fields](/configuration/shared/dial/#domain_resolver) and 
[Route](/configuration/route/#default_domain_resolver).

For migration, see [Migrate outbound DNS rule items to domain resolver](/migration/#migrate-outbound-dns-rule-items-to-domain-resolver).

**3**:

The new TLS fragment route options allow you to fragment TLS handshakes to bypass firewalls.

This feature is intended to circumvent simple firewalls based on **plaintext packet matching**, and should not be used to circumvent real censorship.

Since it is not designed for performance, it should not be applied to all connections, but only to server names that are known to be blocked.

See [Route Action](/configuration/route/rule_action/#tls_fragment).

**4**:

New certificate options allow you to manage the default list of trusted X509 CA certificates.

For the system certificate list, fixed Go not reading Android trusted certificates correctly.

You can also use the Mozilla Included List instead, or add trusted certificates yourself.

See [Certificate](/configuration/certificate/).

### 1.11.0

Important changes since 1.10:

* Introducing rule actions **1**
* Improve tun compatibility **3**
* Merge route options to route actions **4**
* Add `network_type`, `network_is_expensive` and `network_is_constrainted` rule items **5**
* Add multi network dialing **6**
* Add `cache_capacity` DNS option **7**
* Add `override_address` and `override_port` route options **8**
* Upgrade WireGuard outbound to endpoint **9**
* Add UDP GSO support for WireGuard
* Make GSO adaptive **10**
* Add UDP timeout route option **11**
* Add more masquerade options for hysteria2 **12**
* Add `rule-set merge` command
* Add port hopping support for Hysteria2 **13**
* Hysteria2 `ignore_client_bandwidth` behavior update **14**

**1**:

New rule actions replace legacy inbound fields and special outbound fields,
and can be used for pre-matching **2**.

See [Rule](/configuration/route/rule/),
[Rule Action](/configuration/route/rule_action/),
[DNS Rule](/configuration/dns/rule/) and
[DNS Rule Action](/configuration/dns/rule_action/).

For migration, see
[Migrate legacy special outbounds to rule actions](/migration/#migrate-legacy-special-outbounds-to-rule-actions),
[Migrate legacy inbound fields to rule actions](/migration/#migrate-legacy-inbound-fields-to-rule-actions)
and [Migrate legacy DNS route options to rule actions](/migration/#migrate-legacy-dns-route-options-to-rule-actions).

**2**:

Similar to Surge's pre-matching.

Specifically, new rule actions allow you to reject connections with
TCP RST (for TCP connections) and ICMP port unreachable (for UDP packets)
before connection established to improve tun's compatibility.

See [Rule Action](/configuration/route/rule_action/).

**3**:

When `gvisor` tun stack is enabled, even if the request passes routing,
if the outbound connection establishment fails,
the connection still does not need to be established and a TCP RST is replied.

**4**:

Route options in DNS route actions will no longer be considered deprecated,
see [DNS Route Action](/configuration/dns/rule_action/).

Also, now `udp_disable_domain_unmapping` and `udp_connect` can also be configured in route action,
see [Route Action](/configuration/route/rule_action/).

**5**:

When using in graphical clients, new routing rule items allow you to match on
network type (WIFI, cellular, etc.), whether the network is expensive, and whether Low Data Mode is enabled.

See [Route Rule](/configuration/route/rule/), [DNS Route Rule](/configuration/dns/rule/)
and [Headless Rule](/configuration/rule-set/headless-rule/).

**6**:

Similar to Surge's strategy.

New options allow you to connect using multiple network interfaces,
prefer or only use one type of interface,
and configure a timeout to fallback to other interfaces.

See [Dial Fields](/configuration/shared/dial/#network_strategy),
[Rule Action](/configuration/route/rule_action/#network_strategy)
and [Route](/configuration/route/#default_network_strategy).

**7**:

See [DNS](/configuration/dns/#cache_capacity).

**8**:

See [Rule Action](/configuration/route/#override_address) and
[Migrate destination override fields to route options](/migration/#migrate-destination-override-fields-to-route-options).

**9**:

The new WireGuard endpoint combines inbound and outbound capabilities,
and the old outbound will be removed in sing-box 1.13.0.

See [Endpoint](/configuration/endpoint/), [WireGuard Endpoint](/configuration/endpoint/wireguard/)
and [Migrate WireGuard outbound fields to route options](/migration/#migrate-wireguard-outbound-to-endpoint).

**10**:

For WireGuard outbound and endpoint, GSO will be automatically enabled when available,
see [WireGuard Outbound](/configuration/outbound/wireguard/#gso).

For TUN, GSO has been removed,
see [Deprecated](/deprecated/#gso-option-in-tun).

**11**:

See [Rule Action](/configuration/route/rule_action/#udp_timeout).

**12**:

See [Hysteria2](/configuration/inbound/hysteria2/#masquerade).

**13**:

See [Hysteria2](/configuration/outbound/hysteria2/).

**14**:

When `up_mbps` and `down_mbps` are set, `ignore_client_bandwidth` instead denies clients from using BBR CC.
