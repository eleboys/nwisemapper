# NWiseMapper

NWiseMapper is a convention-based Javascript object<->object mapper which both works as NodeJs module and browser javascript library.

## Features

- Subclasses mapping support
- Both Objects and Object-Arrays will be mapped 
- Customize mapping 
- Ignorable members
- Fluid and readble convention defenition pattern 
- Array manipulatiob mapping functions (taking first row of source or pushing to first row of an array for target)


## Usage
```javascript

var nwmapper = require('./dist/nwmapper.js');

nwmapper.initialize(function(conv)  {
  conv.createMap('ObjectC', 'ObjectD', function(emb) {
 	 emb.forMember('title', 'title', function(field1) { return field1 + ' (Added)'; });
  });
  conv.createMap('ObjectA', 'ObjectB', function(emb) {
    emb.forMember('tells', 'tells',  function(tells) { return tells.split(','); } );
    emb.forMember('cityType', 'cityTypeStr',  function(cityType) { return cityType.toString(); });
    emb.forMemberUseMap('files', 'logo', ['ObjectC', 'ObjectD']).takeFirstRowOfSource();
  });
});

var sourceA = {
    tells: '12313,123123,123123',
    emails: 'a@b.com',
    cityType: 12,
	id: 8,
	count: 3,
    files: [{id:1, title:'logo file'}]
};

var targetB = nwmapper.map('ObjectA', 'ObjectB', sourceA);

console.log(targetB);

/* mapped object will be:
{ 
  tells: [ '12313', '123123', '123123' ],
  emails: 'a@b.com',
  cityTypeStr: '12',
  id: 8,
  count: 3,
  logo: { id: 1, title: 'logo file (Added)' } 
}
*/

```

## Installation

#### Bower:
```
bower install nwmapper
```
#### npm:
```
npm install nwmapper
```

## TODO
- Adding Extendability feature for mapping functions