use soroban_sdk::{contracttype, Address, String};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Badge {
    pub recipient: Address,
    pub tier: String,
    pub badge_id: u64,
    pub issued_at: u64,
}

#[contracttype]
pub enum DataKey {
    Admin,
    Badge(u64),
    BadgesByRecipient(Address),
    NextBadgeId,
}
