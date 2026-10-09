import { parseReportExamples } from '../../../src/data/reports'
import rawExamples from './reportExamples.json'
export const reportExamples = parseReportExamples(rawExamples)
