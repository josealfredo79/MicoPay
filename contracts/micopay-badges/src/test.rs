#![cfg(test)]

extern crate std;

use soroban_sdk::{testutils::Address as _, Address, Env, String};

use crate::{MicopayBadges, MicopayBadgesClient};

struct TestEnv {
    env: Env,
    contract_id: Address,
    admin: Address,
}

impl TestEnv {
    fn new() -> Self {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let contract_id = env.register_contract(None, MicopayBadges);
        let badges = MicopayBadgesClient::new(&env, &contract_id);
        badges.initialize(&admin);

        TestEnv {
            env,
            contract_id,
            admin,
        }
    }

    fn badges(&self) -> MicopayBadgesClient<'_> {
        MicopayBadgesClient::new(&self.env, &self.contract_id)
    }
}

#[test]
fn test_initialize_success() {
    let env = Env::default();
    let contract = MicopayBadgesClient::new(&env, &env.register_contract(None, MicopayBadges));

    let admin = Address::generate(&env);
    contract.initialize(&admin);
}

#[test]
fn test_initialize_fails_twice() {
    let t = TestEnv::new();
    let admin2 = Address::generate(&t.env);

    let result = t.badges().try_initialize(&admin2);
    assert!(result.is_err());
}

#[test]
fn test_mint_badge() {
    let t = TestEnv::new();
    let recipient = Address::generate(&t.env);
    let tier = String::from_str(&t.env, "maestro");

    let badge_id = t.badges().mint(&t.admin, &recipient, &tier);
    assert_eq!(badge_id, 1);
}

#[test]
fn test_mint_fails_unauthorized() {
    let t = TestEnv::new();
    let wrong_admin = Address::generate(&t.env);
    let recipient = Address::generate(&t.env);
    let tier = String::from_str(&t.env, "experto");

    let result = t.badges().try_mint(&wrong_admin, &recipient, &tier);
    assert!(result.is_err());
}

#[test]
fn test_get_badges() {
    let t = TestEnv::new();
    let recipient = Address::generate(&t.env);
    let tier = String::from_str(&t.env, "experto");

    t.badges().mint(&t.admin, &recipient, &tier);
    t.badges().mint(&t.admin, &recipient, &tier);

    let badges = t.badges().get_badges(&recipient);
    assert_eq!(badges.len(), 2);
}

#[test]
fn test_get_badges_empty() {
    let t = TestEnv::new();
    let recipient = Address::generate(&t.env);

    let badges = t.badges().get_badges(&recipient);
    assert_eq!(badges.len(), 0);
}

#[test]
fn test_has_badge() {
    let t = TestEnv::new();
    let recipient = Address::generate(&t.env);
    let tier = String::from_str(&t.env, "activo");

    let badge_id = t.badges().mint(&t.admin, &recipient, &tier);

    assert!(t.badges().has_badge(&recipient, &badge_id));
    assert!(!t.badges().has_badge(&recipient, &(badge_id + 1)));
}

#[test]
fn test_multiple_recipients() {
    let t = TestEnv::new();
    let recipient1 = Address::generate(&t.env);
    let recipient2 = Address::generate(&t.env);
    let tier = String::from_str(&t.env, "espora");

    t.badges().mint(&t.admin, &recipient1, &tier);
    t.badges().mint(&t.admin, &recipient2, &tier);

    let badges1 = t.badges().get_badges(&recipient1);
    let badges2 = t.badges().get_badges(&recipient2);

    assert_eq!(badges1.len(), 1);
    assert_eq!(badges2.len(), 1);
}
