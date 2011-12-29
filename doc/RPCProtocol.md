Whatever RPC encoding protocl used (XML, JSON), RPCs SHOULD follow thefollowing specifications.

## Ping Node

  - Method : `PING`

### Query - parameters

  - `id` - String : the node id of the originator (the quirier) of the query

### Response - result

  - `id` - String : the node id of the originator

## Find Node

  - Method : `FIND_NODE`

### Query - parameters

  - `id`     - String : the node id of the originator (the quirier) of the query
  - `target` - String : node id of the targeted node

### Response - result
  
  - `id`    - String        : the node id of the originator
  - `nodes` - Array<String> : array of nodes id

## Find value

  - Method : `FIND_VALUE`
  
### Query - parameters

  - `id`     - String : the node id of the originator (the quirier) of the query
  - `target` - String : value key id of the targeted value

### Response - result
  
  - `id`         - String        : the node id of the originator
  - `nodes`      - Array<String> : array of nodes id (if not found)
  - `value`      - String        : value found       (if found)
  - `expiration` - Integer       : expiration date   (if found)

## Store a value
  
  - Method : `STORE`

### Query - parameters
  
  - `id`         - String  : the node id of the originator (the quirier) of the query
  - `key`        - String  : the key of the value
  - `value`      - String  : value associated to the key
  - `expiration` - Integer : expiration date (<0 means infinite)

### Response - result

  - `id` - String  : the node id of the originator
  
