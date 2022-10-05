pragma ton-solidity = 0.58.1;

/// @notice Attribute types
/// ANY - without quotation marks: uint, int, bool
/// STRING - with quotation marks: string
enum ATTRIBUTE_TYPE {
    ANY,
    STRING
}

/// @notice Library for create dynamic attributes for NFT json
library JSONAttributes {  

    /// @notice Build dynamic attributes and paste like past element to json
    /// @param json Default initial json string (Ex. TIP4.2 json schema)
    /// @param attributeTypes Array of data types for correct build json
    /// @param attributeNames Array of `trait_type` values (names for attribute elements)
    /// @param attributeValues Array of values for attribute elements
    /// @return jsonWithAttributes Json string with attributes
    function buildAdd(
        string json,
        ATTRIBUTE_TYPE[] attributeTypes,
        string[] attributeNames,
        string[] attributeValues
    ) public responsible returns(string jsonWithAttributes) {
        string attributes;
        /// @dev Generate attributes string
        /// Ex: attributes = "{"trait_type": <value>, "value": <value>},{...}"
        for(uint16 i = 0; i < attributeTypes.length; i++) {
            /// @dev Generate formated string
            /// \u007B - escape unicode symbol of <{>
            /// \u007D - escape unicode symbol of <}>
            /// \u0022 - escape unicode symbol of <">
            if(attributeTypes[i] == ATTRIBUTE_TYPE.STRING) {
                /// @dev With quotation marks
                attributes = format("{}\u007B\u0022trait_type\u0022: \u0022{}\u0022,\u0022value\u0022: \u0022{}\u0022\u007D", 
                    attributes,
                    attributeNames[i],
                    attributeValues[i]
                );
            }
            else {
                /// @dev Without quotation marks
                attributes = format("{}\u007B\u0022trait_type\u0022: \u0022{}\u0022,\u0022value\u0022: {}\u007D", 
                    attributes,
                    attributeNames[i],
                    attributeValues[i]
                );
            }
            /// @dev Add IFS if element not last
            if(i != (attributeTypes.length - 1)) {
                attributes = format("{},", attributes);
            }
        }
        /// @dev Create json attributes array from attributes string
        attributes = format("\u0022attributes\u0022: [{}]", attributes);
        /// @dev If json is empty, generate correct json with attributes only
        if(bytes(json).length == 0) {
            jsonWithAttributes = format("\u007B{}\u007D", attributes);
        }
        else {
            /// @dev Divide the json to add the element as the last
            string head = json.substr(0, uint32(bytes(json).length) - 1);
            string tail = json.substr(uint32(bytes(json).length) - 1);
            /// @dev Build json string with attributes
            jsonWithAttributes = head + "," + attributes + tail;
        }
        /// @dev Return json with attributes
        return{
            value: 0,
            flag: 64,
            bounce: false
        }(jsonWithAttributes);
    }

}