module NWise {
	class NWiseFieldMapper {
		private sourceField: string;
		private targetField: string;
		private converter: (src: any) => any = (src: any) => src;
		private ignore: boolean;
		private firstRowOfSource: boolean;

		public getSourceField(): string { return this.sourceField; }
		public setSourceField(srcField: string) { this.sourceField = srcField; }

		public getTargetField(): string { return this.targetField; }
		public setTargetField(trgField: string) { this.targetField = trgField; }

		public getConverter(): (src: any) => any { return this.converter; }
		public setConverter(cnv: (src: any) => any) { this.converter = cnv; }

		public getIgnore(): boolean { return this.ignore; }
		public setIgnore(ignore: boolean) { this.ignore = ignore; }

		public getFirstRowOfSource(): boolean { return this.firstRowOfSource; }
		public takeFirstRowOfSource() { this.firstRowOfSource = true; }		
	}

	class NWiseEntityMapperBuilder {
		private fieldMaps: NWiseFieldMapper[] = [];
		private configuration: NWiseConfiguration;

		constructor(config: NWiseConfiguration) {
			this.configuration = config;
		}

		public forMember(srcM: string, tarM: string, conv?: (src: any) => any) : NWiseFieldMapper {
			var fieldMap = new NWiseFieldMapper();
			fieldMap.setSourceField(srcM);
			fieldMap.setTargetField(tarM);
			if (conv)
				fieldMap.setConverter(conv);
			this.fieldMaps.push(fieldMap);
			return fieldMap;
		}

		public forMemberUseMap(srcM: string, tarM: string, map: [string, string]): NWiseFieldMapper {
			return this.forMember(srcM, tarM, (src) => {
				return this.configuration.getConfiguarationBuilder()
					.getNWiseMapper().map(map[0], map[1], src);
			})
		}

		public ignore(...restOfMembers: string[]) {
			for (var i = 0; i < restOfMembers.length; i++) {
				var fieldMap = new NWiseFieldMapper();
				fieldMap.setSourceField(restOfMembers[i]);
				fieldMap.setIgnore(true);
				this.fieldMaps.push(fieldMap);
			}
		}

		public ignoreOthers() {
			this.ignore('*');
		}

		public map(source: any): any {
			var target = {};
			// retrieve ignore all configuration
			var hasIgnoreAll = this.fieldMaps.findIndex(fm =>fm.getSourceField() === "*" && fm.getIgnore())>-1;
			for (var member in source) {
				var fieldMap = this.fieldMaps.find(fm => fm.getSourceField() === member);
				// if no mapping strategy is defined for the field
				if (typeof (fieldMap) === "undefined") {
					// if must not ignore all field that dont have mapping
					if (!hasIgnoreAll) {
						target[member] = source[member];
					}
				// if field is requested to be ingnored do nothing
				} else if (fieldMap.getIgnore()) {

				} else {
					// get value of sourceField with convert strategy
					var value = fieldMap.getConverter()(source[member]);
					// if is configed to take just the first row of source 
					if (fieldMap.getFirstRowOfSource()) {
						// so the source converted value must be an array
						if (Array.isArray(value)) {
							target[fieldMap.getTargetField()] = value.length ? value[0] : undefined;
						} else {
							throw `taking first row of source works for array value (${member})`;
						}		
					// else put the value for the target	
					} else {
						target[fieldMap.getTargetField()] = value;
					}
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
			builder: NWiseConfigurationBuilder) {
			this.sourceType = source;
			this.targetType = target;
			this.entityMapperBuilder = new NWiseEntityMapperBuilder(this);
			this.builder = builder;
			entityMapperBuilderCallback(this.entityMapperBuilder);
		}

		public getSourceType(): string {
			return this.sourceType;
		}
		public getTargetType(): string {
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
			for (var i = 0; i < this.configs.length; i++) {
				if (this.configs[i].getSourceType() == source && this.configs[i].getTargetType() == target) {
					return this.configs[i];
				}
			}
			return null;
		}

		public getNWiseMapper(): NWiseMapper { return this.nwMapper; }
	}

	export class NWiseMapper {
		private configBuilder: NWiseConfigurationBuilder;

		constructor() {
			this.configBuilder = new NWiseConfigurationBuilder(this);
		}

		public initialize(cnfgCallback: (cnfg: NWiseConfigurationBuilder) => any): NWiseMapper {
			cnfgCallback(this.configBuilder);
			return this;
		}

		public map(sourceType: string, targetType: string, source: any): any {
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
}
var NWMapper = new NWise.NWiseMapper();


// NWMapper.initialize(function (cb) {
//     cb.createMap('C', 'D', function (emb) {
//         emb.forMember('field1', 'field1', function (field1) { return field1 + ' (Added)'; });
//     });
//     cb.createMap('A', 'B', function (emb) {
//         emb.forMember('tells', 'tells', function (tells) { return tells.split(','); });
//         emb.forMember('emails', 'emailsArray', function (emails) { return emails.split(','); });
// 		emb.forMember('cityType', 'cityTypeStr', function (cityType) { return cityType.toString(); });
//         emb.forMemberUseMap('contacts', 'contacties', ['C', 'D'])			.takeFirstRowOfSource();
//     });
// });
// var targetB = NWMapper.map('A', 'B', {
//     tells: '12313,123123,123123',
//     emails: 'a@b.com',
//     cityType: 12,
// 	id: 8,
// 	count: 3,
//     contacts: []
// });
// console.log(targetB);