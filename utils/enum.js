export const TYPE_TOKEN = {
  NATIVE: 'NATIVE',
  ERC20: 'ERC20',
};

export const STATUS = {
  DONE: 'DONE',
  ERROR: 'ERROR',
};

export const SYMBOL_TOKEN = {
  LCR: 'LCR',
  USDT: 'USDT',
  BNB: 'BNB',
  WBNB: 'WBNB',
  WRAPPED_NATIVE: 'WRAPPED_NATIVE',
  CELO: 'CELO',
};

export const SYMBOL_ADDRESS = {
  PANCAKE_ROUTER: 'PANCAKE_ROUTER',
};

export const SYMBOL_NATIVE = {
  1: 'ETH',
  56: 'BNB',
  97: 'BNB',
  42220: 'CELO',
};

export const NATIVE_IN_BITQUERY = {
  1: 'ETH',
  56: 'BNB',
  97: 'BNB',
  42220: 'cGLD',
};

export const SYMBOL_ABI = {
  ROUTER_FORK_UNIV2: 'ROUTER_FORK_UNIV2',
  FACTORY_FORK_UNIV2: 'FACTORY_FORK_UNIV2',
  ERC20: 'ERC20',
  ERC721: 'ERC721',
};

export const SYMBOL_GET_BINANCE = {
  56: {
    BNB: 'BNBUSDT',
  },
  97: {
    BNB: 'BNBUSDT',
  },
  42220: {
    CELO: 'CELOUSDT',
  },
};

export const STATUS_JOB = {
  scheduled: 'scheduled',
  rescheduled: 'rescheduled',
  queued: 'queued',
  running: 'running',
  completed: 'completed',
  failed: 'failed',
  canceled: 'canceled',
};

export const KEY_CONFIG = {
  balance_rate: 'balance_rate',
  generate_dex_auto_daily: 'generate_dex_auto_daily',
  generate_templates_auto_daily: 'generate_templates_auto_daily',
  generate_templates_free_coin_auto_daily: 'generate_templates_free_coin_auto_daily',
  generate_fake_actives_daily: 'generate_fake_actives_daily',
  generate_fake_actives_daily_free_coin: 'generate_fake_actives_daily_free_coin',
  generate_fake_holders_daily: 'generate_fake_holders_daily',
  generate_fake_holders_daily_free_coin: 'generate_fake_holders_daily_free_coin',
  buff_gas_price: 'buff_gas_price',
  buff_gas_limit: 'buff_gas_limit',
  gas_price: 'gas_price',
};

export const TYPE_SCHEDULE = {
  auto: 'auto',
  manual: 'manual',
};

export const TYPE_WALLET = {
  dex: 'dex',
  source_dex: 'source_dex',
  skim: 'skim',
  skim_source: 'skim_source',
  amm: 'amm',
  spending_paid_coin: 'spending_paid_coin',
  spending_free_coin: 'spending_free_coin',
  balance_rate: 'balance_rate',
};

export const TYPE_TEMPLATE = {
  gaps_buyer: 'gaps_buyer',
  gaps_seller: 'gaps_seller',
  balance: 'balance',
  split_buy: 'split_buy',
  split_sell: 'split_sell',
  free_coin_balance: 'free_coin_balance',
  execute_dex: 'execute_dex',
};

export const TYPE_FAKE_HOLDER = {
  reduce_holders: 'reduce_holders',
  increase_holders: 'increase_holders',
};

export const TYPE_QUEUE = {
  agenda: 'agenda',
  agenda_dex: 'agenda_dex',
  agenda_skim: 'agenda_skim',
  agenda_holder: 'agenda_holder',
  agenda_free_coin: 'agenda_free_coin',
};

export const TYPE_CHAIN_SUPPORT = {
  paid_coin: 'paid_coin',
  free_coin: 'free_coin',
};

export const TYPE_ACTIVE_RECENT = {
  buy: 'buy',
  sell: 'sell',
};

export const NAME_JOB = {
  onChain: {
    transfer_native_from_source: 'transfer_native_from_source',
    transfer_token_from_source: 'transfer_token_from_source',
    transfer_on_chain_token: 'transfer_on_chain_token',
    transfer_on_chain_native: 'transfer_on_chain_native',
    deposit_token_utt_to_spending: 'deposit_token_utt_to_spending',
    swap_native_to_token_pancake: 'swap_native_to_token_pancake',
    swap_token_to_native_pancake: 'swap_token_to_native_pancake',
    swap_token_to_token_pancake: 'swap_token_to_token_pancake',
    swap_token_to_token_our_dex: 'swap_token_to_token_our_dex',
    buff_gas_fee: 'buff_gas_fee',
    assets_recovery: 'assets_recovery',
    buff_gas_fee_fake_actives: 'buff_gas_fee_fake_actives',
    buff_gas_fee_fake_holders: 'buff_gas_fee_fake_holders',
    cancel_and_recovery_assets_execute: 'cancel_and_recovery_assets_execute',
    transfer_token_increase_holder: 'transfer_token_increase_holder',
    transfer_free_coin_increase_holder: 'transfer_free_coin_increase_holder',
  },
  offChain: {
    withdraw_token_utt: 'withdraw_token_utt',
  },
  auto: {
    generate_templates_auto: 'generate_templates_auto',
    generate_templates_free_coin_auto: 'generate_templates_free_coin_auto',
  },
  manual: {
    generate_templates_manual: 'generate_templates_manual',
    generate_templates_free_coin_manual: 'generate_templates_free_coin_manual',
  },
  fake_actives: {
    schedule_fake_actives: 'schedule_fake_actives',
    schedule_fake_actives_daily: 'schedule_fake_actives_daily',
    schedule_fake_actives_daily_free_coin: 'schedule_fake_actives_daily_free_coin',
    schedule_fake_actives_manual: 'schedule_fake_actives_manual',
    execute_fake_actives: 'execute_fake_actives',
    execute_fake_actives_free_coin: 'execute_fake_actives_free_coin',
    auto_check_shedule_fake_actives: 'auto_check_shedule_fake_actives',
  },
  balance_rate: {
    balance_rate_sell: 'balance_rate_sell',
    balance_rate_buy: 'balance_rate_buy',
  },
  fake_transactions: {
    fake_transaction_sell: 'fake_transaction_sell',
    fake_transaction_buy: 'fake_transaction_buy',
    fake_transaction_fail: 'fake_transaction_fail',
    repeat_scan_logs: 'repeat_scan_logs',
  },
  holder: {
    schedule_fake_holders: 'schedule_fake_holders',
    schedule_fake_holders_daily: 'schedule_fake_holders_daily',
    schedule_fake_holders_daily_free_coin: 'schedule_fake_holders_daily_free_coin',
    withdraw_increase_holders: 'withdraw_increase_holders',
    deposit_reduce_holders: 'deposit_reduce_holders',
  },
  free_coin: {
    transfer_native_from_spending: 'transfer_native_from_spending',
    transfer_token_from_spending: 'transfer_token_from_spending',
    transfer_native_from_source: 'transfer_native_from_source',
    transfer_token_from_source: 'transfer_token_from_source',
    transfer_on_chain_token: 'transfer_on_chain_token',
    transfer_on_chain_native: 'transfer_on_chain_native',
    swap_token_to_token_our_dex: 'swap_token_to_token_our_dex',
    deposit_token_free_to_spending: 'deposit_token_free_to_spending',
    spending_swap_token_to_token_our_dex: 'spending_swap_token_to_token_our_dex',
    withdraw_free_coin: 'withdraw_free_coin',
  },
  cache: {
    cache_balance_source_all: 'cache_balance_source_all',
    cache_kpi_server: 'cache_kpi_server',
    cache_balances_dex: 'cache_balances_dex',
    backup_database: 'backup_database',
  },
  dex: {
    schedule_dex_auto_daily: 'schedule_dex_auto_daily',
    schedule_dex_manual: 'schedule_dex_manual',
    schedule_execute_jobs: 'schedule_execute_jobs',
    transfer_token_from_source: 'transfer_token_from_source',
    swap_token_to_token_our_dex: 'swap_token_to_token_our_dex',
  },
};
