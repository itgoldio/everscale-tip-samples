import tonos_ts4.ts4 as ts4
from tonclient.types import CallSet
from utils import ZERO_ADDRESS

from wrappers.setcode import Setcode
from config import *

ts4.init(BUILD_ARTIFACTS_PATH, verbose = True)

class Nft(ts4.BaseContract):

    def __init__(self, address: ts4.Address, nft_owner: Setcode = Setcode()):
        super().__init__('Nft', {}, nickname="Nft", address=address)
        self.nft_owner = nft_owner

    @property
    def id(self) -> ts4.Address:
        return self.call_responsible('getInfo')[ID_KEY]

    @property
    def owner(self) -> ts4.Address:
        return self.call_responsible('getInfo')[OWNER_KEY]

    @property
    def manager(self) -> ts4.Address:
        return self.call_responsible('getInfo')[MANAGER_KEY]
    
    @property
    def collection(self) -> ts4.Address:
        return self.call_responsible('getInfo')[COLLECTION_KEY]

    @property 
    def json(self) -> str:
        return self.call_responsible('getJson')

    def call_responsible(self, name: str, params: dict = None):
        if params is None:
            params = dict()
        params['answerId'] = 0
        return self.call_getter(name, params)

    def get_info(self) -> dict:
        return self.call_responsible('getInfo')

    def transfer(
        self,
        to: ts4.Address,
        send_gas_to: ts4.Address = ZERO_ADDRESS,
        callbacks: dict = {},
        transfer_value: int = 0,
        expect_ec: int = 0, 
        dispatch: bool = True
    ):
        call_set = CallSet('transfer', input={
            'to': to.str(),
            'sendGasTo': send_gas_to.str(),
            'callbacks': callbacks
        })
        self.nft_owner.send_call_set(self, value=transfer_value, call_set=call_set, expect_ec=expect_ec, dispatch=dispatch)

    def change_owner(
        self,
        new_owner: ts4.Address,
        send_gas_to: ts4.Address = ZERO_ADDRESS,
        callbacks: dict = {},
        change_value: int = 0,
        expect_ec: int = 0,
        dispatch: bool = True
    ):
        call_set = CallSet('changeOwner', input={
            'newOwner': new_owner.str(),
            'sendGasTo': send_gas_to.str(),
            'callbacks': callbacks
        })
        self.nft_owner.send_call_set(self, value=change_value, call_set=call_set, expect_ec=expect_ec, dispatch=dispatch)

    def change_manager(
        self,
        new_manager: ts4.Address,
        send_gas_to: ts4.Address = ZERO_ADDRESS,
        callbacks: dict = {},
        change_value: int = 0,
        expect_ec: int = 0,
        dispatch: bool = True
    ):
        call_set = CallSet('changeManager', input={
            'newManager': new_manager.str(),
            'sendGasTo': send_gas_to.str(),
            'callbacks': callbacks
        })
        self.nft_owner.send_call_set(self, value=change_value, call_set=call_set, expect_ec=expect_ec, dispatch=dispatch)

    def check_state(
        self,
        expected_nft_owner: ts4.Address,
        expected_nft_manager: ts4.Address,
        expected_collection: ts4.Address,
        expected_nft_balance: int = REMAIN_ON_NFT_VALUE,
    ): 
        assert self.owner == expected_nft_owner, f'Wrong token owner exp: {self.owner}, given: {expected_nft_owner}'
        assert self.manager == expected_nft_manager, f'Wrong token manager exp: {self.manager}, given: {expected_nft_manager}'
        assert self.collection == expected_collection, f'Wrong token creator(collection) exp: {self.collection}, given: {expected_collection}'
        assert self.balance == expected_nft_balance, f'Wrong balance exp: {self.balance}, given: {expected_nft_balance}'