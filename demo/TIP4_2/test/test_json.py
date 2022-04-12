import unittest
import json

from tonos_ts4 import ts4

from config import *

from wrappers.setcode import Setcode
from wrappers.collection import Collection

class TestNftChangeOwner(unittest.TestCase):

    def setUp(self):

        self.owner = Setcode()

    def test_collection_json(self):
        json_data = {}
        json_data["type"] = "Basic NFT collection"
        json_data["name"] = "Test Collection"

        self.collection = Collection(owner=self.owner, json=json.dumps(json_data))
        received_data = json.loads(self.collection.call_responsible('getJson'))
        self.assertEqual(json_data["type"], received_data["type"])
        self.assertEqual(json_data["name"], received_data["name"])

    def test_nft_json(self):
        json_data = {}
        json_data["type"] = "Basic NFT"
        json_data["name"] = "Test NFT"

        collection = Collection(owner=self.owner)
        collection.mint_nft(nft_owner=self.owner, mint_value=int(REMAIN_ON_NFT_VALUE + 0.2 * ts4.GRAM), json=json.dumps(json_data))
        event = ts4.pop_event()
        self.assertTrue(event.is_event('NftCreated', src = collection.address, dst = ts4.Address(None)))
        nft = collection.nft_of(self.owner, 0)
        received_data = json.loads(nft.json)
        self.assertEqual(json_data["type"], received_data["type"])
        self.assertEqual(json_data["name"], received_data["name"])

    