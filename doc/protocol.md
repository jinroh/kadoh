Whatever RPC encoding protocl used (XML, JSON), RPCs SHOULD follow thefollowing specifications.

## Ping Node

  - Method : `PING`

### Query - parameters

  - `id` - String : the node id of the querying node

### Response - result

  - `id` - String : the node id of the queried node

## Find Node

  - Method : `FIND_NODE`

### Query - parameters

  - `id`     - String : the node id of the querying node
  - `target` - String : node id of the targeted node

### Response - result
  
  - `id`    - String        : the node id of the queried node
  - `nodes` - Array<Array<String>> : array of array [node_address, node_id]

## Find value

  - Method : `FIND_VALUE`
  
### Query - parameters

  - `id`     - String : the node id of the querying node
  - `target` - String : value key id of the targeted value

### Response - result
  
  - `id`         - String        : the node id of the queried node
  - `nodes` - Array<Array<String>> : _if not found_ array of array [node_address, node_id]
  - `value`      - String        : _if found_ value found
  - `expiration` - Integer       : _if found_ expiration date

## Store a value
  
  - Method : `STORE`

### Query - parameters
  
  - `id`         - String  : the node id of the querying node
  - `key`        - String  : the key of the value
  - `value`      - String  : value associated to the key
  - `expiration` - Integer : expiration date (<0 means infinite)

### Response - result

  - `id` - String  : the node id of the queried node
  
