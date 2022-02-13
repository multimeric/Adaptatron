export enum Command {
    Define = "lordefine",
    Card = "lorcard"
}

export enum FilterType {
    NameContains = "name",
    DescriptionContains = "description",
    LevelUpContains = "level_up",
    AttackEquals = "attack_equals",
    AttackGreater = "attack_greater",
    AttackLess = "attack_less",
    HealthEquals = "health_equals",
    HealthGreater = "health_greater",
    HealthLess = "health_less",
    CostEquals = "cost_equals",
    CostGreater = "cost_greater",
    CostLess = "cost_less",
    HasKeyword = "keyword",
    HasSupertype = "supertype",
    HasType = "type",
    HasSubtype = "subtype",
    FromRegion = "region",
    FromSet = "set",
    SpellSpeed = "speed",
    HasRarity = "rarity"
}