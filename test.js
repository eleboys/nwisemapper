
var nwmapper = require('./dist/nwmapper.js');

console.log(nwmapper);

nwmapper.initialize(function (cb) {
    cb.createMap('C', 'D', function (emb) {
        emb.forMember('field1', 'field1', function (field1) { return field1 + ' (Added)'; });
    });
    cb.createMap('A', 'B', function (emb) {
        emb.forMember('tells', 'tells', function (tells) { return tells.split(','); });
        emb.forMember('emails', 'emailsArray', function (emails) { return emails.split(','); });
		emb.forMember('cityType', 'cityTypeStr', function (cityType) { return cityType.toString(); });
        emb.forMemberUseMap('contacts', 'contacties', ['C', 'D']).takeFirstRowOfSource();
    });
});

var targetA = {
    tells: '12313,123123,123123',
    emails: 'a@b.com',
    cityType: 12,
	id: 8,
	count: 3,
    contacts: []
};
var targetB = nwmapper.map('A', 'B', targetA);
console.log(targetB);