import type { OpportunityCandidate } from "@saas-lead/contracts";
export interface OpportunityDetector { detect(input: unknown): readonly OpportunityCandidate[] }
export class DetectOpportunityProcessor { constructor(private readonly detector:OpportunityDetector){} process(input:unknown){return this.detector.detect(input)} }
