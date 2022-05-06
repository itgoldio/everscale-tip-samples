import unittest

from tonclient.types import CallSet
from tonos_ts4 import ts4

from config import *
from utils import random_address

from wrappers.setcode import Setcode
from wrappers.collection import Collection
from wrappers.nft import Nft

class TestNftChangeOwner(unittest.TestCase):

    def setUp(self):
        self.nft_owner = Setcode()
        self.collection = Collection(owner=self.nft_owner)
        self.collection.mint_nft(nft_owner=self.nft_owner, mint_value=int (REMAIN_ON_NFT_VALUE + 0.2 * ts4.GRAM))
        event = ts4.pop_event()
        self.assertTrue(event.is_event('NftCreated', src = self.collection.address, dst = ts4.Address(None)))
        self.nft = self.collection.nft_of(self.nft_owner, 0)

    def test_common(self):
        old_nft_owner = self.nft_owner
        new_nft_owner = Setcode()

        self.nft.change_owner(
            new_owner=new_nft_owner.address, 
            change_value=CHANGE_OWNER_VALUE
        )
        
        event = ts4.pop_event()

        self.assertTrue(event.is_event('OwnerChanged', src = self.nft.address, dst = ts4.Address(None)))
        self.assertEqual(old_nft_owner.address, ts4.Address(event.params['oldOwner']))
        self.assertEqual(new_nft_owner.address, ts4.Address(event.params['newOwner']))

        self.nft.check_state(
            new_nft_owner.address,
            old_nft_owner.address,
            self.collection.address,
            REMAIN_ON_NFT_VALUE + CHANGE_OWNER_VALUE
        )
        self.nft.nft_owner = new_nft_owner

    def test_with_wrong_owner(self):
        old_owner = self.nft.nft_owner
        wrong_owner = Setcode()
        self.nft.nft_owner = wrong_owner

        self.nft.change_owner(
            new_owner=random_address(), 
            change_value=CHANGE_OWNER_VALUE,
            expect_ec=103
        )

        self.nft.check_state(
            old_owner.address,
            old_owner.address,
            self.collection.address,
            REMAIN_ON_NFT_VALUE
        )

    def test_with_send_gas_to(self):
        old_nft_owner = self.nft_owner
        new_nft_owner = Setcode()
        
        self.nft.change_owner(
            new_owner=new_nft_owner.address, 
            send_gas_to=old_nft_owner.address, 
            change_value=CHANGE_OWNER_VALUE
        )
        
        event = ts4.pop_event()

        self.assertTrue(event.is_event('OwnerChanged', src = self.nft.address, dst = ts4.Address(None)))
        self.assertEqual(old_nft_owner.address, ts4.Address(event.params['oldOwner']))
        self.assertEqual(new_nft_owner.address, ts4.Address(event.params['newOwner']))
        
        self.nft.check_state(
            new_nft_owner.address,
            old_nft_owner.address,
            self.collection.address,
            REMAIN_ON_NFT_VALUE
        )

    def test_with_the_same_owner(self):
        old_nft_owner = self.nft.nft_owner
        new_nft_owner = old_nft_owner

        self.nft.change_owner(
            new_owner=new_nft_owner.address, 
            change_value=CHANGE_OWNER_VALUE
        )

        # if new_owner == old_owner - Events will not be emited
        self.assertTrue(len(ts4.g.EVENTS) == 0)

        self.nft.check_state(
            new_nft_owner.address,
            new_nft_owner.address,
            self.collection.address,
            REMAIN_ON_NFT_VALUE + CHANGE_OWNER_VALUE
        )

    def test_with_callbacks(self):
        old_nft_owner = self.nft_owner
        new_nft_owner = Setcode()

        payload_1_receiver = random_address()
        payload_2_receiver = random_address()
        callbacks = {
            payload_1_receiver.str(): {
                "value": SEND_CALLBACK_VALUE, 
                "payload": "te6ccgEBAQEAMAAAW1t00puAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACLA="
            },
            payload_2_receiver.str(): {
                "value": SEND_CALLBACK_VALUE, 
                "payload": "te6ccgEBAQEAMAAAW1t00puAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACLA="
            }
        }

        self.nft.change_owner(
            new_owner=new_nft_owner.address, 
            change_value=CHANGE_OWNER_WITH_CALLBACKS_VALUE, 
            callbacks=callbacks,
            dispatch=False
        )

        # changeOwner
        msg = ts4.peek_msg()
        self.assertTrue(msg.is_call('changeOwner') and msg.dst == self.nft.address)
        ts4.dispatch_one_message()
       
        # callback 1
        msg = ts4.peek_msg()
        self.assertTrue(msg.src == self.nft.address)
        self.assertTrue(msg.dst == payload_1_receiver or msg.dst == payload_2_receiver)
        self.assertTrue(msg.value == SEND_CALLBACK_VALUE)
        ts4.dispatch_one_message()

        # callback 2
        msg = ts4.peek_msg()
        self.assertTrue(msg.src == self.nft.address)
        self.assertTrue(msg.dst == payload_1_receiver or msg.dst == payload_2_receiver)
        self.assertTrue(msg.value == SEND_CALLBACK_VALUE)
        ts4.dispatch_one_message()  

        
        event = ts4.pop_event()

        self.assertTrue(event.is_event('OwnerChanged', src = self.nft.address, dst = ts4.Address(None)))
        self.assertEqual(old_nft_owner.address, ts4.Address(event.params['oldOwner']))
        self.assertEqual(new_nft_owner.address, ts4.Address(event.params['newOwner']))

        self.nft.check_state(
            new_nft_owner.address,
            old_nft_owner.address,
            self.collection.address,
            REMAIN_ON_NFT_VALUE + CHANGE_OWNER_WITH_CALLBACKS_VALUE - 2 * SEND_CALLBACK_VALUE
        )

    def test_with_callbacks_and_wrong_value(self):
        old_nft_owner = self.nft_owner
        new_nft_owner = Setcode()

        callbacks = {
            random_address().str(): {
                "value": SEND_CALLBACK_VALUE, 
                "payload": "te6ccgEBAQEAMAAAW1t00puAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACLA="
            },
            random_address().str(): {
                "value": SEND_CALLBACK_VALUE, 
                "payload": "te6ccgEBAQEAMAAAW1t00puAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACLA="
            },
            random_address().str(): {
                "value": SEND_CALLBACK_VALUE, 
                "payload": "te6ccgEBAQEAMAAAW1t00puAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACLA="
            },
            random_address().str(): {
                "value": SEND_CALLBACK_VALUE, 
                "payload": "te6ccgEBAQEAMAAAW1t00puAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACLA="
            },
            random_address().str(): {
                "value": SEND_CALLBACK_VALUE, 
                "payload": "te6ccgEBAQEAMAAAW1t00puAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACLA="
            },
            random_address().str(): {
                "value": SEND_CALLBACK_VALUE, 
                "payload": "te6ccgEBAQEAMAAAW1t00puAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACLA="
            }
        }

        self.nft.change_owner(
            new_owner=new_nft_owner.address, 
            change_value=CHANGE_OWNER_WITH_WRONG_CALLBACKS_VALUE, 
            callbacks=callbacks,
            dispatch=False
        )

        try: 
            ts4.dispatch_one_message()
        except Exception:
            self.nft.check_state(
                old_nft_owner.address,
                old_nft_owner.address,
                self.collection.address,
                REMAIN_ON_NFT_VALUE
            )

        # if transaction is failed - events not be emited
        self.assertTrue(len(ts4.g.EVENTS) == 0)