from tonos_ts4 import ts4

BUILD_ARTIFACTS_PATH = '../build'

REMAIN_ON_NFT_VALUE = int(0.3 * ts4.GRAM)
INITIAL_BALANCE = int(100 * ts4.GRAM)
MINT_NFT_VALUE = int(0.5 * ts4.GRAM)

CHANGE_OWNER_VALUE = int(0.2 * ts4.GRAM)
CHANGE_MANAGER_VALUE = int(0.2 * ts4.GRAM)

CHANGE_OWNER_WITH_CALLBACKS_VALUE = int(0.5 * ts4.GRAM)
CHANGE_MANAGER_WITH_CALLBACKS_VALUE = int(0.5 * ts4.GRAM)
SEND_CALLBACK_VALUE = int(0.1 * ts4.GRAM)
TEST_PAYLOAD = ts4.Cell('te6ccgEBAQEAMAAAW1t00puAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACLA=')
TEST_PAYLOAD_2 = ts4.Cell('te6ccgEBAQEAMAAAW1t00puAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHJA=')

#nft.getInfo keys
ID_KEY = 0
OWNER_KEY = 1
MANAGER_KEY = 2
COLLECTION_KEY = 3
# GET_INFO_KEYS = {"ID_KEY": 0, "OWNER_KEY": 1, "MANAGER_KEY": 2, "COLLECTION_KEY": 3}
