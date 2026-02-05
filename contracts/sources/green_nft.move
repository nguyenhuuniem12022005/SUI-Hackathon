/// Green Product NFT Module for P-Market
/// NFT certificates for eco-friendly/green products
module pmarket::green_nft {
    use std::string::{Self, String};
    use sui::url::{Self, Url};
    use sui::event;
    use sui::clock::{Self, Clock};

    /// Error codes
    const ENotAuthorized: u64 = 0;
    const ENotOwner: u64 = 1;
    const EAlreadyCertified: u64 = 2;
    const EInvalidProductId: u64 = 3;

    /// Certification levels
    const LEVEL_BRONZE: u8 = 1;
    const LEVEL_SILVER: u8 = 2;
    const LEVEL_GOLD: u8 = 3;
    const LEVEL_PLATINUM: u8 = 4;

    /// Admin capability for minting green NFTs
    public struct GreenNFTAdminCap has key, store {
        id: UID
    }

    /// Issuer capability - for verified suppliers who can self-certify
    public struct IssuerCap has key, store {
        id: UID,
        issuer_name: String,
        issuer_address: address,
    }

    /// Green Product NFT - Certificate for eco-friendly products
    /// This is a soulbound NFT (key only, no store) - cannot be transferred
    public struct GreenProductNFT has key {
        id: UID,
        /// Product ID from the backend database
        product_id: u64,
        /// Product name
        product_name: String,
        /// Certification level (1-4)
        certification_level: u8,
        /// Issuer name
        issuer: String,
        /// Owner address (seller)
        owner: address,
        /// Certification date (timestamp in ms)
        certified_at: u64,
        /// Expiration date (optional, 0 means no expiration)
        expires_at: u64,
        /// Description of why this product is green
        description: String,
        /// Image URL for the certificate
        image_url: Url,
        /// Additional metadata as JSON string
        metadata: String,
    }

    /// Registry to track certified products (prevent duplicates)
    public struct CertificationRegistry has key {
        id: UID,
    }

    /// Events
    public struct GreenNFTMinted has copy, drop {
        nft_id: ID,
        product_id: u64,
        product_name: String,
        certification_level: u8,
        owner: address,
        issuer: String,
        certified_at: u64,
    }

    public struct GreenNFTRevoked has copy, drop {
        nft_id: ID,
        product_id: u64,
        revoked_by: address,
    }

    public struct IssuerCapCreated has copy, drop {
        issuer_cap_id: ID,
        issuer_name: String,
        issuer_address: address,
    }

    /// Initialize module
    fun init(ctx: &mut TxContext) {
        // Create admin capability
        let admin_cap = GreenNFTAdminCap {
            id: object::new(ctx)
        };
        transfer::transfer(admin_cap, tx_context::sender(ctx));

        // Create shared registry
        let registry = CertificationRegistry {
            id: object::new(ctx)
        };
        transfer::share_object(registry);
    }

    /// Create an issuer capability for a verified supplier
    public entry fun create_issuer_cap(
        _admin: &GreenNFTAdminCap,
        issuer_name: vector<u8>,
        issuer_address: address,
        ctx: &mut TxContext
    ) {
        let name = string::utf8(issuer_name);
        let issuer_cap = IssuerCap {
            id: object::new(ctx),
            issuer_name: name,
            issuer_address,
        };

        event::emit(IssuerCapCreated {
            issuer_cap_id: object::id(&issuer_cap),
            issuer_name: name,
            issuer_address,
        });

        transfer::transfer(issuer_cap, issuer_address);
    }

    /// Mint a Green Product NFT (by admin)
    public entry fun mint_green_nft(
        _admin: &GreenNFTAdminCap,
        product_id: u64,
        product_name: vector<u8>,
        certification_level: u8,
        owner: address,
        description: vector<u8>,
        image_url: vector<u8>,
        metadata: vector<u8>,
        validity_days: u64, // 0 for no expiration
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(product_id > 0, EInvalidProductId);

        let current_time = clock::timestamp_ms(clock);
        let expires_at = if (validity_days > 0) {
            current_time + (validity_days * 86400000) // days to ms
        } else {
            0
        };

        let name = string::utf8(product_name);
        let nft = GreenProductNFT {
            id: object::new(ctx),
            product_id,
            product_name: name,
            certification_level,
            issuer: string::utf8(b"P-Market Official"),
            owner,
            certified_at: current_time,
            expires_at,
            description: string::utf8(description),
            image_url: url::new_unsafe_from_bytes(image_url),
            metadata: string::utf8(metadata),
        };

        let nft_id = object::id(&nft);

        event::emit(GreenNFTMinted {
            nft_id,
            product_id,
            product_name: name,
            certification_level,
            owner,
            issuer: string::utf8(b"P-Market Official"),
            certified_at: current_time,
        });

        // Transfer to owner (soulbound - they own it but cannot transfer)
        transfer::transfer(nft, owner);
    }

    /// Mint a Green Product NFT (by verified issuer/supplier)
    public entry fun mint_green_nft_by_issuer(
        issuer_cap: &IssuerCap,
        product_id: u64,
        product_name: vector<u8>,
        certification_level: u8,
        description: vector<u8>,
        image_url: vector<u8>,
        metadata: vector<u8>,
        validity_days: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(product_id > 0, EInvalidProductId);

        let current_time = clock::timestamp_ms(clock);
        let expires_at = if (validity_days > 0) {
            current_time + (validity_days * 86400000)
        } else {
            0
        };

        let owner = issuer_cap.issuer_address;
        let name = string::utf8(product_name);
        
        let nft = GreenProductNFT {
            id: object::new(ctx),
            product_id,
            product_name: name,
            certification_level,
            issuer: issuer_cap.issuer_name,
            owner,
            certified_at: current_time,
            expires_at,
            description: string::utf8(description),
            image_url: url::new_unsafe_from_bytes(image_url),
            metadata: string::utf8(metadata),
        };

        let nft_id = object::id(&nft);

        event::emit(GreenNFTMinted {
            nft_id,
            product_id,
            product_name: name,
            certification_level,
            owner,
            issuer: issuer_cap.issuer_name,
            certified_at: current_time,
        });

        transfer::transfer(nft, owner);
    }

    /// Revoke/burn a Green Product NFT (by admin)
    public entry fun revoke_green_nft(
        _admin: &GreenNFTAdminCap,
        nft: GreenProductNFT,
        ctx: &TxContext
    ) {
        let GreenProductNFT {
            id,
            product_id,
            product_name: _,
            certification_level: _,
            issuer: _,
            owner: _,
            certified_at: _,
            expires_at: _,
            description: _,
            image_url: _,
            metadata: _,
        } = nft;

        event::emit(GreenNFTRevoked {
            nft_id: object::uid_to_inner(&id),
            product_id,
            revoked_by: tx_context::sender(ctx),
        });

        object::delete(id);
    }

    /// Owner can voluntarily burn their NFT
    public entry fun burn_own_nft(
        nft: GreenProductNFT,
        ctx: &TxContext
    ) {
        assert!(nft.owner == tx_context::sender(ctx), ENotOwner);

        let GreenProductNFT {
            id,
            product_id,
            product_name: _,
            certification_level: _,
            issuer: _,
            owner: _,
            certified_at: _,
            expires_at: _,
            description: _,
            image_url: _,
            metadata: _,
        } = nft;

        event::emit(GreenNFTRevoked {
            nft_id: object::uid_to_inner(&id),
            product_id,
            revoked_by: tx_context::sender(ctx),
        });

        object::delete(id);
    }

    // === View functions ===

    public fun get_product_id(nft: &GreenProductNFT): u64 {
        nft.product_id
    }

    public fun get_product_name(nft: &GreenProductNFT): String {
        nft.product_name
    }

    public fun get_certification_level(nft: &GreenProductNFT): u8 {
        nft.certification_level
    }

    public fun get_issuer(nft: &GreenProductNFT): String {
        nft.issuer
    }

    public fun get_owner(nft: &GreenProductNFT): address {
        nft.owner
    }

    public fun get_certified_at(nft: &GreenProductNFT): u64 {
        nft.certified_at
    }

    public fun get_expires_at(nft: &GreenProductNFT): u64 {
        nft.expires_at
    }

    public fun is_expired(nft: &GreenProductNFT, clock: &Clock): bool {
        if (nft.expires_at == 0) {
            false
        } else {
            clock::timestamp_ms(clock) > nft.expires_at
        }
    }

    public fun get_level_name(level: u8): String {
        if (level == LEVEL_BRONZE) {
            string::utf8(b"Bronze")
        } else if (level == LEVEL_SILVER) {
            string::utf8(b"Silver")
        } else if (level == LEVEL_GOLD) {
            string::utf8(b"Gold")
        } else if (level == LEVEL_PLATINUM) {
            string::utf8(b"Platinum")
        } else {
            string::utf8(b"Unknown")
        }
    }

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(ctx);
    }
}
