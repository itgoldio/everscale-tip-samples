import unittest

from tonclient.types import CallSet
from tonos_ts4 import ts4

from config import MINT_NFT_VALUE, REMAIN_ON_NFT_VALUE, BUILD_ARTIFACTS_PATH, INITIAL_BALANCE

from wrappers.setcode import Setcode
from wrappers.collection import Collection
from wrappers.nft import Nft

class TestNftChangeOwner(unittest.TestCase):

    def setUp(self):
        nft_owner = Setcode()
        self.collection = Collection(owner=nft_owner)
        self.collection.mint_nft(nft_owner=nft_owner, value=REMAIN_ON_NFT_VALUE)
        self.nft = self.collection.nft_of(nft_owner, 0)

    def test_common(self):
        recipient_wallet = Setcode()
        self.nft.change_owner(recipient_wallet, change_value=0.2*ts4.GRAM)
        self.nft.check_state(
            recipient_wallet.address,
            recipient_wallet.address,
            self.collection.address,
            REMAIN_ON_NFT_VALUE
        )