// The "Beyond 3NF" video (BCNF, 4NF and 5NF from a 3NF schema): composition NormalizationAdvanced.
// Script: SCRIPT-normalization-advanced.md.
import {defineSqlVideo} from '../sql/common/SqlVideo';
import {SPEECH_INTERVALS} from './narration';
import {AdvTitleScene} from './scenes/A01Title';
import {CaseScene} from './scenes/A02Case';
import {ConceptsScene} from './scenes/A03Concepts';
import {AdvBCNFScene} from './scenes/A04BCNF';
import {FourthNFScene} from './scenes/A05FourthNF';
import {FifthNFScene} from './scenes/A06FifthNF';
import {AdvSummaryScene} from './scenes/A07Summary';
import {QuestionsScene} from './scenes/A08Questions';
import {AdvOutroScene} from './scenes/A09Outro';
import {TIMELINE, TOTAL_FRAMES} from './timeline';

export const NF_ADVANCED_VIDEO = defineSqlVideo(
  'NormalizationAdvanced',
  [
    {key: 'title', id: 'NfAdvTitle', Component: AdvTitleScene},
    {key: 'case', id: 'NfAdvCase', Component: CaseScene},
    {key: 'concepts', id: 'NfAdvConcepts', Component: ConceptsScene},
    {key: 'bcnf', id: 'NfAdvBCNF', Component: AdvBCNFScene},
    {key: 'nf4', id: 'NfAdv4NF', Component: FourthNFScene},
    {key: 'nf5', id: 'NfAdv5NF', Component: FifthNFScene},
    {key: 'summary', id: 'NfAdvSummary', Component: AdvSummaryScene},
    {key: 'questions', id: 'NfAdvQuestions', Component: QuestionsScene},
    {key: 'outro', id: 'NfAdvOutro', Component: AdvOutroScene},
  ],
  TIMELINE,
  TOTAL_FRAMES,
  SPEECH_INTERVALS,
);
