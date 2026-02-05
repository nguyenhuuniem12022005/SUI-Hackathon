/// PMT (P-Market Token) - Custom Fungible Token for P-Market DApp
/// This module creates a fungible token using SUI's Coin standard
module pmarket::pmarket_token {
    use sui::coin::{Self, Coin, TreasuryCap};
    use sui::url::{Self, Url};

    /// One-Time Witness for creating the PMT currency
    public struct PMARKET_TOKEN has drop {}

    /// Error codes
    const EInsufficientBalance: u64 = 0;
    const ENotAuthorized: u64 = 1;

    /// Initialize the PMT token with metadata
    /// This function is called once when the module is published
    fun init(witness: PMARKET_TOKEN, ctx: &mut TxContext) {
        let (treasury_cap, metadata) = coin::create_currency<PMARKET_TOKEN>(
            witness,
            6, // decimals (like USDC)
            b"PMT", // symbol
            b"P-Market Token", // name
            b"Official token for P-Market - a green marketplace on SUI blockchain", // description
            option::some(url::new_unsafe_from_bytes(b"https://pmarket.io/token-icon.png")), // icon URL
            ctx
        );

        // Freeze metadata so it cannot be changed
        transfer::public_freeze_object(metadata);
        
        // Transfer treasury cap to the deployer (admin)
        transfer::public_transfer(treasury_cap, tx_context::sender(ctx));
    }

    /// Mint new PMT tokens to a recipient
    /// Only the holder of TreasuryCap can mint
    public entry fun mint(
        treasury_cap: &mut TreasuryCap<PMARKET_TOKEN>,
        amount: u64,
        recipient: address,
        ctx: &mut TxContext
    ) {
        let coin = coin::mint(treasury_cap, amount, ctx);
        transfer::public_transfer(coin, recipient);
    }

    /// Burn PMT tokens from the caller's balance
    public entry fun burn(
        treasury_cap: &mut TreasuryCap<PMARKET_TOKEN>,
        coin: Coin<PMARKET_TOKEN>
    ) {
        coin::burn(treasury_cap, coin);
    }

    /// Transfer PMT tokens to another address
    public entry fun transfer_token(
        coin: Coin<PMARKET_TOKEN>,
        recipient: address,
    ) {
        transfer::public_transfer(coin, recipient);
    }

    /// Split a coin and transfer part of it
    public entry fun split_and_transfer(
        coin: &mut Coin<PMARKET_TOKEN>,
        amount: u64,
        recipient: address,
        ctx: &mut TxContext
    ) {
        let split_coin = coin::split(coin, amount, ctx);
        transfer::public_transfer(split_coin, recipient);
    }

    /// Get the total supply of PMT tokens
    public fun total_supply(treasury_cap: &TreasuryCap<PMARKET_TOKEN>): u64 {
        coin::total_supply(treasury_cap)
    }

    /// Merge multiple coins into one
    public entry fun merge_coins(
        coin: &mut Coin<PMARKET_TOKEN>,
        other: Coin<PMARKET_TOKEN>
    ) {
        coin::join(coin, other);
    }

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(PMARKET_TOKEN {}, ctx);
    }
}
