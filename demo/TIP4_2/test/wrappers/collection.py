from curses import intrflush
from tonos_ts4 import ts4
from tonclient.types import CallSet

from config import BUILD_ARTIFACTS_PATH, REMAIN_ON_NFT_VALUE
from utils import random_address

from wrappers.setcode import Setcode
from wrappers.nft import Nft

ts4.init(BUILD_ARTIFACTS_PATH, verbose = True)

class Collection(ts4.BaseContract):

    def __init__(
        self, 
        contract_name: str = 'Collection', 
        ctor_params: dict = None, 
        code_nft: ts4.Cell = ts4.load_code_cell('Nft.tvc'),
        owner: Setcode = Setcode(),
        json: str = "{}"
    ):
        self.owner = owner
        if ctor_params is None:
            ctor_params = {
                'codeNft': code_nft,
                'ownerPubkey': owner.keypair[1],
                'json': json
            }
        super().__init__(
            contract_name,
            ctor_params,
            nickname='Collection',
            override_address=random_address(),
            # keypair=owner.keypair,
        )

    def call_responsible(self, name: str, params: dict = None):
        if params is None:
            params = dict()
        params['answerId'] = 0
        return self.call_getter(name, params)

    @property
    def total_supply(self) -> int:
        return self.call_responsible('totalSupply')

    def mint_nft(
        self,
        nft_owner: Setcode = Setcode(),
        json: str = "{}",
        mint_value: int = REMAIN_ON_NFT_VALUE,
        expect_ec: int = 0,
    ):
        call_set = CallSet('mintNft', input={"json": json})
        nft_id = self.total_supply
        nft_owner.send_call_set(self, value=mint_value, call_set=call_set, expect_ec=expect_ec)

    def nft_of(self, nft_owner: Setcode, nft_id: int) -> Nft:
        nft_address = self.call_responsible('nftAddress', {'id': nft_id})
        return Nft(nft_address, nft_owner)