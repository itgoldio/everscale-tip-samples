import unittest

from tonclient.types import CallSet
from tonos_ts4 import ts4

from config import MINT_NFT_VALUE, REMAIN_ON_NFT_VALUE, BUILD_ARTIFACTS_PATH, INITIAL_BALANCE
from utils import check_supports_interfaces

from wrappers.setcode import Setcode
from wrappers.collection import Collection
from wrappers.nft import Nft

ts4.init(BUILD_ARTIFACTS_PATH, verbose = True)

class TestCollection(unittest.TestCase):

    def setUp(self):
        nft_owner = Setcode()
        self.collection = Collection(owner=nft_owner)

    def test_base(self):
        expected_nft_code = ts4.load_code_cell('Nft')
        setcode_wallet = Setcode()
        collection = Collection(owner=setcode_wallet)   
        # self.assertEqual(collection.call_responsible('nftCode'), expected_nft_code)
        # self.assertEqual(collection.call_responsible('owner'), setcode_wallet.keypair[0])
        interface_ids = (0x1217AAAB, 0x3204EC29)
        check_supports_interfaces(collection, interface_ids)
        self.assertEqual(collection.balance, INITIAL_BALANCE, 'Wrong collection balance')

    def test_mint(self):
        setcode_wallet = Setcode()
        setcode_initial_balance = ts4.get_balance(setcode_wallet.address)
        collection = Collection(owner=setcode_wallet)   
        collection.mint_nft(nft_owner=setcode_wallet, mint_value=MINT_NFT_VALUE)
        event = ts4.pop_event()
        self.assertTrue(event.is_event('NftCreated', src = collection.address, dst = ts4.Address(None)))
        self.assertEqual(collection.total_supply, 1, 'Wrong total supply')
        self.assertEqual(setcode_initial_balance - REMAIN_ON_NFT_VALUE, ts4.get_balance(setcode_wallet.address), 'Wrong balance')
        nft = collection.nft_of(setcode_wallet, 0)
        nft.check_state(
            setcode_wallet.address,
            setcode_wallet.address,
            collection.address,
            REMAIN_ON_NFT_VALUE
        )