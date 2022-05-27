
188.227.35.77
http://188.227.35.77/

0:2ca79e0aef944a7cb68c6f09d88a54fc7d2ae19a2cdb6df4b4d8a3788c075814

tonos-cli --url $NETWORK call $initials_addr submitTransaction '{"dest":"'$vdc_addr'","value":5000000000,"bounce":true,"allBalance":false,"payload":"te6ccgEBAgEAGgABCF0Hv4ABACJ7eyJuYW1lIjoiTmljayJ9fQ=="}' --abi $setcode_abi --sign $initials_keys

tonos-cli --url http://188.227.35.77/ call 0:488921925e7f2d103ba1fd0af0552f180ea94ce0df7b6f82eed69d27e7882106 submitTransaction '{"dest":"0:77d308156e67a485f0550c81412bb44e0d186f361fe914fab223e7fa9a1f3831","value":5000000000,"bounce":true,"allBalance":false,"payload":"te6ccgEBAgEAPAABSycEo0qACREkMkvP5aIHdD+hXgql4wHVKZwb723wXdrTpPzxBCDQAQAie3sibmFtZSI6Ik5pY2sifX0="}' --abi ../../../vendoring/setcodemultisig/SetcodeMultisigWallet.abi.json --sign 1.keys.json

tonos-cli body --abi Collection.abi.json mintNft '{"json": "{{\"name\":\"Nick\"}}", "delegatedPlayerAddress": "0:488921925e7f2d103ba1fd0af0552f180ea94ce0df7b6f82eed69d27e7882106"}'

tonos-cli body --abi Nft.abi.json getPrize '{}'

getPrize

tonos-cli --url http://188.227.35.77/ call 0:488921925e7f2d103ba1fd0af0552f180ea94ce0df7b6f82eed69d27e7882106 submitTransaction '{"dest":"0:77d308156e67a485f0550c81412bb44e0d186f361fe914fab223e7fa9a1f3831","value":5000000000,"bounce":true,"allBalance":false,"payload":"te6ccgEBAQEABgAACCF5k7A="}' --abi ../../../vendoring/setcodemultisig/SetcodeMultisigWallet.abi.json --sign 1.keys.json

te6ccgEBAQEABgAACCF5k7A=

string json,
        address delegatedPlayerAddress

te6ccgEBAgEAGgABCF0Hv4ABACJ7eyJuYW1lIjoiTmljayJ9fQ==

0:eb02ee68d780d13f490a1d39ba790d7a3b973eb7ae3fce78363a60c29e7e6821

tonos-cli --url http://188.227.35.77/ run 0:eb722423e8b51414819bd78a6c45037a280741c4dde6b2fca7bcc008d960643b getJson '{"answerId": 0}' --abi Nft.abi.json