use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum BadgeError {
    NotInitialized = 1,
    AlreadyInitialized = 2,
    BadgeNotFound = 3,
    Unauthorized = 4,
    BadgeAlreadyExists = 5,
}
