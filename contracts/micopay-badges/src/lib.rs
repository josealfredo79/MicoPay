#![no_std]

mod errors;
mod types;

#[cfg(test)]
mod test;

use errors::BadgeError;
use types::{Badge, DataKey};

use soroban_sdk::{contract, contractimpl, symbol_short, Address, Env, String, Vec};

const TTL_EXTEND: u32 = 555_680;
const TTL_MIN: u32 = 25;

#[contract]
pub struct MicopayBadges;

#[contractimpl]
impl MicopayBadges {
    pub fn initialize(env: Env, admin: Address) -> Result<(), BadgeError> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(BadgeError::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::NextBadgeId, &1u64);
        env.storage().instance().extend_ttl(TTL_MIN, TTL_EXTEND);
        Ok(())
    }

    pub fn mint(
        env: Env,
        admin: Address,
        recipient: Address,
        tier: String,
    ) -> Result<u64, BadgeError> {
        admin.require_auth();

        let stored_admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(BadgeError::NotInitialized)?;

        if admin != stored_admin {
            return Err(BadgeError::Unauthorized);
        }

        let badge_id: u64 = env
            .storage()
            .instance()
            .get(&DataKey::NextBadgeId)
            .unwrap_or(1u64);

        let issued_at = env.ledger().timestamp();
        let recipient_clone = recipient.clone();
        let tier_clone = tier.clone();

        let badge = Badge {
            recipient: recipient.clone(),
            tier: tier.clone(),
            badge_id,
            issued_at,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Badge(badge_id), &badge);
        env.storage().instance().extend_ttl(TTL_MIN, TTL_EXTEND);
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::Badge(badge_id), TTL_MIN, TTL_EXTEND);

        let mut recipient_badges: Vec<u64> = env
            .storage()
            .persistent()
            .get(&DataKey::BadgesByRecipient(recipient.clone()))
            .unwrap_or(Vec::new(&env));

        recipient_badges.push_back(badge_id);

        env.storage().persistent().set(
            &DataKey::BadgesByRecipient(recipient_clone.clone()),
            &recipient_badges,
        );
        env.storage().instance().extend_ttl(TTL_MIN, TTL_EXTEND);
        env.storage().persistent().extend_ttl(
            &DataKey::BadgesByRecipient(recipient_clone.clone()),
            TTL_MIN,
            TTL_EXTEND,
        );

        let next_badge_id = badge_id + 1;
        env.storage()
            .instance()
            .set(&DataKey::NextBadgeId, &next_badge_id);

        env.events().publish(
            (symbol_short!("minted"),),
            (badge_id, recipient_clone, tier_clone),
        );

        Ok(badge_id)
    }

    pub fn get_badges(env: Env, recipient: Address) -> Vec<Badge> {
        let badge_ids: Vec<u64> = env
            .storage()
            .persistent()
            .get::<DataKey, Vec<u64>>(&DataKey::BadgesByRecipient(recipient.clone()))
            .unwrap_or(Vec::new(&env));

        let mut badges = Vec::new(&env);
        for i in 0..badge_ids.len() {
            let badge_id = badge_ids.get(i).unwrap_or(0);
            if let Some(badge) = env
                .storage()
                .persistent()
                .get::<DataKey, Badge>(&DataKey::Badge(badge_id))
            {
                badges.push_back(badge);
            }
        }

        env.storage().instance().extend_ttl(TTL_MIN, TTL_EXTEND);

        if env
            .storage()
            .persistent()
            .has(&DataKey::BadgesByRecipient(recipient.clone()))
        {
            env.storage().persistent().extend_ttl(
                &DataKey::BadgesByRecipient(recipient),
                TTL_MIN,
                TTL_EXTEND,
            );
        }

        badges
    }

    pub fn has_badge(env: Env, recipient: Address, badge_id: u64) -> bool {
        let badge: Option<Badge> = env.storage().persistent().get(&DataKey::Badge(badge_id));

        match badge {
            Some(b) => b.recipient == recipient,
            None => false,
        }
    }
}
