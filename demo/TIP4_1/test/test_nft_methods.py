import unittest

from tonos_ts4 import ts4

from config import REMAIN_ON_NFT_VALUE, BUILD_ARTIFACTS_PATH
from utils import check_supports_interfaces

from wrappers.setcode import Setcode
from wrappers.collection import Collection

ts4.init(BUILD_ARTIFACTS_PATH, verbose = True)

class TestNft(unittest.TestCase):

    def setUp(self):
        self.nft_owner = Setcode()
        self.collection = Collection(owner=self.nft_owner)
        self.collection.mint_nft(nft_owner=self.nft_owner, mint_value=int (REMAIN_ON_NFT_VALUE + 0.2 * ts4.GRAM))
        event = ts4.pop_event()
        self.assertTrue(event.is_event('NftCreated', src = self.collection.address, dst = ts4.Address(None)))
        self.nft = self.collection.nft_of(self.nft_owner, 0)

    def test_base(self):
        #0x78084F7E - TIP4_1NFT 
        #0x3204EC29 - ITIP6
        interface_ids = (0x78084F7E, 0x3204EC29)
        check_supports_interfaces(self.nft, interface_ids)
        self.assertEqual(self.nft.balance, REMAIN_ON_NFT_VALUE, 'Wrong nft balance')
        self.nft.check_state(
            self.nft_owner.address,
            self.nft_owner.address,
            self.collection.address,
            REMAIN_ON_NFT_VALUE
        )