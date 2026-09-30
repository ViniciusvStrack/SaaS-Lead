export interface SuggestionGenerator{generate(input:{organizationId:string;opportunityId:string}):Promise<{content:string}>}
export class GenerateSuggestionProcessor{constructor(private readonly generator:SuggestionGenerator){}process(input:{organizationId:string;opportunityId:string}){return this.generator.generate(input);}}
