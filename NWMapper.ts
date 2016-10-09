
class NWiseFieldMapper {
	private sourceField: string;
	private targetField: string;
	private converter: (src: any) => any = (src: any) => src;
	private ignore: boolean;

	public getSourceField(): string { return this.sourceField; }
	public setSourceField(srcField: string) { this.sourceField = srcField; }

	public getTargetField(): string { return this.targetField; }
	public setTargetField(trgField: string) { this.targetField = trgField; }

	public getConverter(): (src: any) => any { return this.converter; }
	public setConverter(cnv: (src: any) => any) { this.converter = cnv; }

	public getIgnore(): boolean { return this.ignore; }
	public setIgnore(ignore:boolean) { this.ignore = ignore; }
}

class NWiseEntityMapperBuilder {
	private fieldMaps: NWiseFieldMapper[] = [];
	private configuration: NWiseConfiguration;

	constructor(config: NWiseConfiguration) {
		this.configuration = config;
	}

	public forMember(srcM: string, tarM: string, conv?: (src: any) => any) {
		var fieldMap = new NWiseFieldMapper();
		fieldMap.setSourceField(srcM);
		fieldMap.setTargetField(tarM);
		if (conv)
			fieldMap.setConverter(conv);
		this.fieldMaps.push(fieldMap);
	}

	public forMemberUseMap(srcM: string, tarM: string, map: [string, string]) {
		this.forMember(srcM, tarM, (src) => {
			return this.configuration.getConfiguarationBuilder()
					   .getNWiseMapper().map(map[0], map[1], src);
		})
	}

	public ignore(targetMember: string) {
		var fieldMap = new NWiseFieldMapper();
		fieldMap.setSourceField(targetMember);
		fieldMap.setIgnore(true);
		this.fieldMaps.push(fieldMap);
	}

	public map(source: any): any {
		var target = {};
		for (var member in source) {
			var fieldMap = this.fieldMaps.find(function (fm) {
				return fm.getSourceField() === member;
			})
			if (typeof (fieldMap) === "undefined") {
				target[member] = source[member];
			} else if (fieldMap.getIgnore()) {

			} else {
				target[fieldMap.getTargetField()] = fieldMap.getConverter()(source[member]);
			}
		}
		return target;
	}

	public mapArray(sources: any[]): any {
		return sources.map(src => this.map(src));
	}
}

class NWiseConfiguration {
	private sourceType: string;
	private targetType: string;
	private entityMapperBuilder: NWiseEntityMapperBuilder;
	private builder: NWiseConfigurationBuilder;

	constructor(source: string, target: string,
				entityMapperBuilderCallback: (fmbcnfg: any) => any,
				builder: NWiseConfigurationBuilder)
	{
		this.sourceType = source;
		this.targetType = target;
		this.entityMapperBuilder = new NWiseEntityMapperBuilder(this);
		this.builder = builder;
		entityMapperBuilderCallback(this.entityMapperBuilder);
	}

	public getSourceType(): string{
		return this.sourceType;
	}
	public getTargetType(): string{
		return this.targetType;
	}
	public getEntityMapperBuilder(): NWiseEntityMapperBuilder {
		return this.entityMapperBuilder;
	}

	public getConfiguarationBuilder(): NWiseConfigurationBuilder { return this.builder; }
}

class NWiseConfigurationBuilder {
	private nwMapper: NWiseMapper;
	private configs: NWiseConfiguration[] = [];

	constructor(nwMapper: NWiseMapper) {
		this.nwMapper = nwMapper;
	}

	public createMap(source: string, target: string, callback: (entityMapperBuilder: NWiseEntityMapperBuilder) => any): NWiseConfigurationBuilder {
		this.configs.push(new NWiseConfiguration(source, target, callback, this));
		return this;
	}

	public find(source: string, target: string): NWiseConfiguration {
		for (var i = 0; i < this.configs.length; i++){
			if (this.configs[i].getSourceType() == source && this.configs[i].getTargetType() == target) {
				return this.configs[i];
			}
		}
		return null;
	}

	public getNWiseMapper(): NWiseMapper { return this.nwMapper; }
}

class NWiseMapper {
	private configBuilder: NWiseConfigurationBuilder;

	constructor() {
		this.configBuilder = new NWiseConfigurationBuilder(this);
	}

	public initialize(cnfgCallback: (cnfg: NWiseConfigurationBuilder) => any): NWiseMapper {
		cnfgCallback(this.configBuilder);
		return this;
	}

	public map(sourceType: string, targetType: string, source: any) : any {
		var mapCnfg = this.configBuilder.find(sourceType, targetType);
		if (mapCnfg == null) {
			throw `no configuration is defined to map ${sourceType} to ${targetType}`;
		}

		var entityMapper = mapCnfg.getEntityMapperBuilder();
		if (Array.isArray(source))
			return entityMapper.mapArray(source);
		else
			return entityMapper.map(source);
	}
}

var NWMapper = new NWiseMapper();

NWMapper.initialize(cb => {
	cb.createMap('C', 'D', emb => {
		emb.forMember('field1', 'field1', field1 => field1 + ' (Added)');
	});

	cb.createMap('A', 'B', emb => {
		emb.forMember('tells', 'tells', tells => tells.split(','));
		emb.forMember('emails', 'emailsArray', emails => emails.split(','));
		emb.forMember('cityType', 'cityTypeStr', cityType => cityType.toString());
		emb.ignore('id');
		emb.forMemberUseMap('contacts', 'contacties', ['C', 'D']);
	});
});

var targetB = NWMapper.map('A', 'B', [{
	tells: '12313,123123,123123',
	emails: 'a@b.com',
	cityType: 12,
	id: 8,
	contacts: {
		field1: 10,
		field2: "NNima"
	}
}, {
	tells: '12313,123123,123123',
	emails: 'a@b.com',
	cityType: 12,
	id: 8,
	contacts: [{
		field1: 10,
		field2: "NNima"
	},{
		field1: 10,
		field2: "NNima"
	}]
}]);

console.log(targetB);
