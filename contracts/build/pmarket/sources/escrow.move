/// Escrow Module for P-Market
/// Handles secure payment escrow between buyers and sellers
module pmarket::escrow {
    use sui::coin::{Self, Coin};
    use sui::clock::{Self, Clock};
    use sui::event;
    use pmarket::pmarket_token::PMARKET_TOKEN;

    /// Error codes
    const ENotBuyer: u64 = 0;
    const ENotSeller: u64 = 1;
    const ENotAuthorized: u64 = 2;
    const EInvalidStatus: u64 = 3;
    const EEscrowNotExpired: u64 = 5;
    const EInsufficientAmount: u64 = 6;

    /// Escrow status constants
    const STATUS_PENDING: u8 = 0;
    const STATUS_SELLER_CONFIRMED: u8 = 1;
    const STATUS_COMPLETED: u8 = 2;
    const STATUS_CANCELLED: u8 = 3;
    const STATUS_DISPUTED: u8 = 4;

    /// Default escrow expiration time (7 days in milliseconds)
    const DEFAULT_EXPIRATION_MS: u64 = 604800000;

    /// Admin capability for dispute resolution
    public struct AdminCap has key, store {
        id: UID
    }

    /// Escrow object that holds funds
    public struct Escrow has key, store {
        id: UID,
        /// Order ID from the backend
        order_id: u64,
        /// Buyer's address
        buyer: address,
        /// Seller's address
        seller: address,
        /// Amount in escrow (PMT tokens)
        amount: u64,
        /// Escrowed coins
        coins: Coin<PMARKET_TOKEN>,
        /// Current status
        status: u8,
        /// Creation timestamp
        created_at: u64,
        /// Expiration timestamp
        expires_at: u64,
    }

    /// Events
    public struct EscrowCreated has copy, drop {
        escrow_id: ID,
        order_id: u64,
        buyer: address,
        seller: address,
        amount: u64,
        expires_at: u64,
    }

    public struct EscrowConfirmedBySeller has copy, drop {
        escrow_id: ID,
        order_id: u64,
    }

    public struct EscrowCompleted has copy, drop {
        escrow_id: ID,
        order_id: u64,
        amount: u64,
        seller: address,
    }

    public struct EscrowCancelled has copy, drop {
        escrow_id: ID,
        order_id: u64,
        refund_to: address,
        amount: u64,
    }

    public struct EscrowDisputed has copy, drop {
        escrow_id: ID,
        order_id: u64,
        initiated_by: address,
    }

    /// Initialize module - create admin capability
    fun init(ctx: &mut TxContext) {
        let admin_cap = AdminCap {
            id: object::new(ctx)
        };
        transfer::transfer(admin_cap, tx_context::sender(ctx));
    }

    /// Create a new escrow
    /// Called by buyer when placing an order
    public entry fun create_escrow(
        order_id: u64,
        seller: address,
        payment: Coin<PMARKET_TOKEN>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let buyer = tx_context::sender(ctx);
        let amount = coin::value(&payment);
        let current_time = clock::timestamp_ms(clock);
        let expires_at = current_time + DEFAULT_EXPIRATION_MS;

        assert!(amount > 0, EInsufficientAmount);

        let escrow = Escrow {
            id: object::new(ctx),
            order_id,
            buyer,
            seller,
            amount,
            coins: payment,
            status: STATUS_PENDING,
            created_at: current_time,
            expires_at,
        };

        let escrow_id = object::id(&escrow);

        event::emit(EscrowCreated {
            escrow_id,
            order_id,
            buyer,
            seller,
            amount,
            expires_at,
        });

        // Share the escrow object so both parties can interact with it
        transfer::share_object(escrow);
    }

    /// Seller confirms they have shipped the product
    public entry fun seller_confirm(
        escrow: &mut Escrow,
        ctx: &TxContext
    ) {
        let sender = tx_context::sender(ctx);
        
        assert!(sender == escrow.seller, ENotSeller);
        assert!(escrow.status == STATUS_PENDING, EInvalidStatus);

        escrow.status = STATUS_SELLER_CONFIRMED;

        event::emit(EscrowConfirmedBySeller {
            escrow_id: object::id(escrow),
            order_id: escrow.order_id,
        });
    }

    /// Buyer confirms delivery and releases funds to seller
    public entry fun confirm_delivery(
        escrow: &mut Escrow,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        
        assert!(sender == escrow.buyer, ENotBuyer);
        assert!(
            escrow.status == STATUS_PENDING || escrow.status == STATUS_SELLER_CONFIRMED, 
            EInvalidStatus
        );

        // Extract all coins and transfer to seller
        let amount = escrow.amount;
        let payment = coin::split(&mut escrow.coins, amount, ctx);
        transfer::public_transfer(payment, escrow.seller);

        escrow.status = STATUS_COMPLETED;

        event::emit(EscrowCompleted {
            escrow_id: object::id(escrow),
            order_id: escrow.order_id,
            amount,
            seller: escrow.seller,
        });
    }

    /// Cancel escrow and refund buyer
    /// Can only be called by buyer before seller confirms
    public entry fun cancel_escrow(
        escrow: &mut Escrow,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        
        assert!(sender == escrow.buyer, ENotBuyer);
        assert!(escrow.status == STATUS_PENDING, EInvalidStatus);

        // Refund to buyer
        let amount = escrow.amount;
        let refund = coin::split(&mut escrow.coins, amount, ctx);
        transfer::public_transfer(refund, escrow.buyer);

        escrow.status = STATUS_CANCELLED;

        event::emit(EscrowCancelled {
            escrow_id: object::id(escrow),
            order_id: escrow.order_id,
            refund_to: escrow.buyer,
            amount,
        });
    }

    /// Cancel expired escrow
    /// Anyone can call this after expiration to refund buyer
    public entry fun cancel_expired_escrow(
        escrow: &mut Escrow,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let current_time = clock::timestamp_ms(clock);
        
        assert!(current_time > escrow.expires_at, EEscrowNotExpired);
        assert!(
            escrow.status == STATUS_PENDING || escrow.status == STATUS_SELLER_CONFIRMED,
            EInvalidStatus
        );

        // Refund to buyer
        let amount = escrow.amount;
        let refund = coin::split(&mut escrow.coins, amount, ctx);
        transfer::public_transfer(refund, escrow.buyer);

        escrow.status = STATUS_CANCELLED;

        event::emit(EscrowCancelled {
            escrow_id: object::id(escrow),
            order_id: escrow.order_id,
            refund_to: escrow.buyer,
            amount,
        });
    }

    /// Initiate a dispute
    /// Can be called by buyer or seller
    public entry fun initiate_dispute(
        escrow: &mut Escrow,
        ctx: &TxContext
    ) {
        let sender = tx_context::sender(ctx);
        
        assert!(
            sender == escrow.buyer || sender == escrow.seller, 
            ENotAuthorized
        );
        assert!(
            escrow.status == STATUS_PENDING || escrow.status == STATUS_SELLER_CONFIRMED,
            EInvalidStatus
        );

        escrow.status = STATUS_DISPUTED;

        event::emit(EscrowDisputed {
            escrow_id: object::id(escrow),
            order_id: escrow.order_id,
            initiated_by: sender,
        });
    }

    /// Admin resolves dispute - release to seller
    public entry fun resolve_dispute_to_seller(
        _admin: &AdminCap,
        escrow: &mut Escrow,
        ctx: &mut TxContext
    ) {
        assert!(escrow.status == STATUS_DISPUTED, EInvalidStatus);

        let amount = escrow.amount;
        let payment = coin::split(&mut escrow.coins, amount, ctx);
        transfer::public_transfer(payment, escrow.seller);

        escrow.status = STATUS_COMPLETED;

        event::emit(EscrowCompleted {
            escrow_id: object::id(escrow),
            order_id: escrow.order_id,
            amount,
            seller: escrow.seller,
        });
    }

    /// Admin resolves dispute - refund to buyer
    public entry fun resolve_dispute_to_buyer(
        _admin: &AdminCap,
        escrow: &mut Escrow,
        ctx: &mut TxContext
    ) {
        assert!(escrow.status == STATUS_DISPUTED, EInvalidStatus);

        let amount = escrow.amount;
        let refund = coin::split(&mut escrow.coins, amount, ctx);
        transfer::public_transfer(refund, escrow.buyer);

        escrow.status = STATUS_CANCELLED;

        event::emit(EscrowCancelled {
            escrow_id: object::id(escrow),
            order_id: escrow.order_id,
            refund_to: escrow.buyer,
            amount,
        });
    }

    // === View functions ===

    public fun get_order_id(escrow: &Escrow): u64 {
        escrow.order_id
    }

    public fun get_buyer(escrow: &Escrow): address {
        escrow.buyer
    }

    public fun get_seller(escrow: &Escrow): address {
        escrow.seller
    }

    public fun get_amount(escrow: &Escrow): u64 {
        escrow.amount
    }

    public fun get_status(escrow: &Escrow): u8 {
        escrow.status
    }

    public fun get_expires_at(escrow: &Escrow): u64 {
        escrow.expires_at
    }

    public fun is_expired(escrow: &Escrow, clock: &Clock): bool {
        clock::timestamp_ms(clock) > escrow.expires_at
    }

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(ctx);
    }
}
