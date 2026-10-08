#/bin/sh

SERVER_SECRET_KEY=9750de26a94e8abc80035613eaee235bec7ea66b7d6bd8709aceb87366be4239 /
NUMBER_OF_HOPS=1 /
DEFAULT_SOURCE_PUBKEY=npub10c77eupeddajud07y6algccx7xdr4c60wdex7vr0g5use9kapj2qpv4v2k /
NOSTR_RELAYS=wss://relay.nostr.band,wss://relay.snort.social,wss://relay.nostu.be /
ELO_PLUGIN_WEIGHTS='{"d3aa7e54cc5fc3e2390984bfc6faabfa1a9316118c30dff53b47e3dabe655aef:activity_videos":0.3,"d3aa7e54cc5fc3e2390984bfc6faabfa1a9316118c30dff53b47e3dabe655aef:video_community":0.2,"d3aa7e54cc5fc3e2390984bfc6faabfa1a9316118c30dff53b47e3dabe655aef:video_viewer":0.5, "d3aa7e54cc5fc3e2390984bfc6faabfa1a9316118c30dff53b47e3dabe655aef:video_engagement": 0.2}' \
bun run mcp

