import unittest

from tonclient.types import CallSet
from tonos_ts4 import ts4

from config import *
from utils import random_address

from wrappers.setcode import Setcode
from wrappers.collection import Collection
from wrappers.nft import Nft

class TestNftChangeManager(unittest.TestCase):

    def setUp(self):
        self.nft_owner = Setcode()
        self.collection = Collection(owner=self.nft_owner)
        self.collection.mint_nft(nft_owner=self.nft_owner, mint_value=int (REMAIN_ON_NFT_VALUE + 0.2 * ts4.GRAM))
        event = ts4.pop_event()
        self.assertTrue(event.is_event('NftCreated', src = self.collection.address, dst = ts4.Address(None)))
        self.nft = self.collection.nft_of(self.nft_owner, 0)

    def test_common(self):
        old_nft_manager = self.nft_owner
        new_nft_manager = Setcode()

        self.nft.change_manager(
            new_manager=new_nft_manager.address, 
            change_value=CHANGE_MANAGER_VALUE
        )
        
        event = ts4.pop_event()

        self.assertTrue(event.is_event('ManagerChanged', src = self.nft.address, dst = ts4.Address(None)))
        self.assertEqual(old_nft_manager.address, ts4.Address(event.params['oldManager']))
        self.assertEqual(new_nft_manager.address, ts4.Address(event.params['newManager']))

        self.nft.check_state(
            self.nft.nft_owner.address,
            new_nft_manager.address,
            self.collection.address,
            REMAIN_ON_NFT_VALUE + CHANGE_MANAGER_VALUE
        )

    def test_with_wrong_owner(self):
        old_owner = self.nft.owner
        old_manager = self.nft.manager
        wrong_owner = Setcode()
        self.nft.nft_owner = wrong_owner

        self.nft.change_manager(
            new_manager=random_address(), 
            change_value=CHANGE_MANAGER_VALUE,
            expect_ec=103
        )

        self.nft.check_state(
            old_owner,
            old_manager,
            self.collection.address,
            REMAIN_ON_NFT_VALUE
        )

    def test_with_send_gas_to(self):
        old_nft_manager = self.nft_owner
        new_nft_manager = Setcode()
        
        self.nft.change_manager(
            new_manager=new_nft_manager.address, 
            send_gas_to=old_nft_manager.address, 
            change_value=CHANGE_MANAGER_VALUE
        )
        
        event = ts4.pop_event()

        self.assertTrue(event.is_event('ManagerChanged', src = self.nft.address, dst = ts4.Address(None)))
        self.assertEqual(old_nft_manager.address, ts4.Address(event.params['oldManager']))
        self.assertEqual(new_nft_manager.address, ts4.Address(event.params['newManager']))
        
        self.nft.check_state(
            self.nft.nft_owner.address,
            new_nft_manager.address,
            self.collection.address,
            REMAIN_ON_NFT_VALUE
        )

    def test_with_the_same_manager(self):
        old_nft_manager = self.nft_owner
        new_nft_manager = old_nft_manager

        self.nft.change_manager(
            new_manager=new_nft_manager.address, 
            change_value=CHANGE_MANAGER_VALUE
        )

        # if new_manager == old_manager - Events will not be emited
        self.assertTrue(len(ts4.g.EVENTS) == 0)

        self.nft.check_state(
            self.nft.nft_owner.address,
            new_nft_manager.address,
            self.collection.address,
            REMAIN_ON_NFT_VALUE + CHANGE_MANAGER_VALUE
        )

    def test_with_callbacks(self):
        old_nft_manager = self.nft_owner
        new_nft_manager = Setcode()

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

        self.nft.change_manager(
            new_manager=new_nft_manager.address, 
            change_value=CHANGE_MANAGER_WITH_CALLBACKS_VALUE,
            callbacks=callbacks,
            dispatch=False
        )

        # changeOwner
        msg = ts4.peek_msg()
        self.assertTrue(msg.is_call('changeManager') and msg.dst == self.nft.address)
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

        self.assertTrue(event.is_event('ManagerChanged', src = self.nft.address, dst = ts4.Address(None)))
        self.assertEqual(old_nft_manager.address, ts4.Address(event.params['oldManager']))
        self.assertEqual(new_nft_manager.address, ts4.Address(event.params['newManager']))

        self.nft.check_state(
            self.nft.nft_owner.address,
            new_nft_manager.address,
            self.collection.address,
            REMAIN_ON_NFT_VALUE + CHANGE_MANAGER_WITH_CALLBACKS_VALUE - 2 * SEND_CALLBACK_VALUE
        )

    def test_with_on_bounce(self):
        old_nft_manager = self.nft_owner
        new_nft_manager = random_address()

        payload_receiver = new_nft_manager
        callbacks = {
            payload_receiver.str(): {
                "value": SEND_CALLBACK_VALUE, 
                "payload": "te6ccgEBAQEAMAAAW1t00puAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACLA="
            }
        }

        self.nft.change_manager(
            new_manager=new_nft_manager, 
            change_value=CHANGE_MANAGER_WITH_CALLBACKS_VALUE,
            callbacks=callbacks,
            dispatch=False
        )

        # changeOwner
        msg = ts4.peek_msg()
        self.assertTrue(msg.is_call('changeManager') and msg.dst == self.nft.address)
        ts4.dispatch_one_message()
       
        # callback
        msg = ts4.peek_msg()
        self.assertTrue(msg.src == self.nft.address)
        self.assertTrue(msg.dst == payload_receiver)
        self.assertTrue(msg.value == SEND_CALLBACK_VALUE)
        ts4.dispatch_one_message()

        # bounced message
        msg = ts4.peek_msg()
        self.assertTrue(msg.src == payload_receiver)
        self.assertTrue(msg.bounced)
        self.assertTrue(msg.value == SEND_CALLBACK_VALUE)
        ts4.dispatch_one_message()
        
        # send gas to owner
        msg = ts4.peek_msg()
        self.assertTrue(msg.src == self.nft.address)
        self.assertTrue(msg.dst == self.nft.nft_owner.address)
        self.assertTrue(msg.value == SEND_CALLBACK_VALUE)
        ts4.dispatch_one_message()

        event = ts4.pop_event()

        self.assertTrue(event.is_event('ManagerChanged', src = self.nft.address, dst = ts4.Address(None)))
        self.assertEqual(old_nft_manager.address, ts4.Address(event.params['oldManager']))
        self.assertEqual(new_nft_manager, ts4.Address(event.params['newManager']))

        self.nft.check_state(
            self.nft.nft_owner.address,
            self.nft.nft_owner.address,
            self.collection.address,
            REMAIN_ON_NFT_VALUE + CHANGE_MANAGER_WITH_CALLBACKS_VALUE - SEND_CALLBACK_VALUE
        )