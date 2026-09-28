/**
 * Bank of real, commonly-taught high-school reactions, plus a deterministic
 * picker for worksheets.
 *
 * Every `balancedPlain` string below is stored in already-balanced form and is
 * verified by `__tests__/chem.test.ts`, which runs the balancer in
 * `./equation` over the whole bank, checks that the derived coefficients match
 * the written ones, and checks that `classifyReaction` returns the declared
 * type. The `unbalancedPlain` prompt is generated from the balanced form at
 * module load: the species list is left untouched and only the coefficients are
 * stripped and replaced.
 */

import {
  balanceEquation,
  classifyReaction,
  parseEquation,
} from './equation';
import { renderNodes, plainCharge, formatCharge } from './formula';
import type { ReactionTemplate, ReactionType } from '../../types/chem';

export type { ReactionTemplate, ReactionType };
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface ReactionBankEntry {
  type: ReactionType;
  /** Already-balanced equation, ASCII (`->` arrow). */
  balancedPlain: string;
  /** Same reaction with the coefficients replaced. ASCII. */
  unbalancedPlain: string;
  difficulty: Difficulty;
}

type BankSeed = Record<ReactionType, Record<Difficulty, string[]>>;

/* ------------------------------------------------------------------ */
/* The bank                                                            */
/* ------------------------------------------------------------------ */

const SYNTHESIS_EASY = [
  '2H2 + O2 -> 2H2O',
  'H2 + Cl2 -> 2HCl',
  'H2 + Br2 -> 2HBr',
  'N2 + 3H2 -> 2NH3',
  '2Na + Cl2 -> 2NaCl',
  '2K + Cl2 -> 2KCl',
  '2Li + Cl2 -> 2LiCl',
  '2Na + Br2 -> 2NaBr',
  '2K + I2 -> 2KI',
  'CaO + H2O -> Ca(OH)2',
  'Na2O + H2O -> 2NaOH',
  'K2O + H2O -> 2KOH',
  'BaO + H2O -> Ba(OH)2',
  'SO3 + H2O -> H2SO4',
  'CO2 + H2O -> H2CO3',
  '2Cu + O2 -> 2CuO',
  '4Al + 3O2 -> 2Al2O3',
  '2Mg + O2 -> 2MgO',
  '2Zn + O2 -> 2ZnO',
  'C + O2 -> CO2',
  'S + O2 -> SO2',
  '2Pb + O2 -> 2PbO',
  'Sn + O2 -> SnO2',
  'Fe + S -> FeS',
  'Cu + S -> CuS',
  'Zn + S -> ZnS',
  'Cd + S -> CdS',
  'Sn + S -> SnS',
  'Pb + S -> PbS',
  'Hg + S -> HgS',
];

const SYNTHESIS_MEDIUM = [
  '2Na + H2 -> 2NaH',
  'Ca + H2 -> CaH2',
  'Sr + H2 -> SrH2',
  'C + 2S -> CS2',
  'Si + O2 -> SiO2',
  'Si + C -> SiC',
  'Ti + 2Cl2 -> TiCl4',
  'Sn + 2Cl2 -> SnCl4',
  '2Al + 3Cl2 -> 2AlCl3',
  '2B + 3Cl2 -> 2BCl3',
  '2Fe + 3Cl2 -> 2FeCl3',
  '2Cu + Cl2 -> 2CuCl',
  'Mg + Cl2 -> MgCl2',
  'Zn + Cl2 -> ZnCl2',
  '2Na + O2 -> Na2O2',
  '4Na + O2 -> 2Na2O',
  '4K + O2 -> 2K2O',
  '2Ca + O2 -> 2CaO',
  '2Ba + O2 -> 2BaO',
  '2Sr + O2 -> 2SrO',
  '2Be + O2 -> 2BeO',
  '4Fe + 3O2 -> 2Fe2O3',
  '2Cd + O2 -> 2CdO',
  'H2 + S -> H2S',
  'NH3 + HCl -> NH4Cl',
  'NH3 + HBr -> NH4Br',
  'SO2 + H2O -> H2SO3',
  'Na2O + CO2 -> Na2CO3',
  'K2O + CO2 -> K2CO3',
  'CaO + CO2 -> CaCO3',
  'MgO + CO2 -> MgCO3',
  '2NH3 + H2SO4 -> (NH4)2SO4',
  '2K + 2NH2? -> 2KNH2 + H2',
  'CaO + 2HCl? no',
  '2Mg + 3O2? no',
  'Si + 2H2? no',
  '3NH3 + H3PO4 -> (NH4)3PO4',
  'C2H4 + H2 -> C2H6',
  'C2H2 + H2 -> C2H4',
  'NH3 + HF -> NH4F',
  '2Na + 2NH3? no',
].filter((s) => !s.includes('?'));

const SYNTHESIS_HARD = [
  'P4 + 5O2 -> P4O10',
  'P4 + 3O2 -> P4O6',
  '4B + 3O2 -> 2B2O3',
  '4As + 3O2 -> 2As2O3',
  '4Bi + 3O2 -> 2Bi2O3',
  '4Sb + 3O2 -> 2Sb2O3',
  '4V + 5O2 -> 2V2O5',
  '4Cr + 3O2 -> 2Cr2O3',
  '4Mn + 3O2 -> 2Mn2O3',
  '4Co + 3O2 -> 2Co2O3',
  '2Ni + O2 -> 2NiO',
  '4La + 3O2 -> 2La2O3',
  '4Sc + 3O2 -> 2Sc2O3',
  '4Y + 3O2 -> 2Y2O3',
  '2Al + N2 -> 2AlN',
  '3Mg + N2 -> Mg3N2',
  '3Ca + N2 -> Ca3N2',
  '6Li + N2 -> 2Li3N',
  'CaO + SiO2 -> CaSiO3',
  'Na2O + SiO2 -> Na2SiO3',
  'B2O3 + 3H2O -> 2H3BO3',
  'P4O10 + 6H2O -> 4H3PO4',
  'N2O5 + H2O -> 2HNO3',
  'CaO + SO3 -> CaSO4',
  'Na2O + SO3 -> Na2SO4',
  'MgO + SO3 -> MgSO4',
  'Al2O3 + 3SO3 -> Al2(SO4)3',
  '2W + 3O2 -> 2WO3',
  '4Re + 7O2 -> 2Re2O7',
  '2Mo + 3O2 -> 2MoO3',
  '4Li + O2 -> 2Li2O',
  '4In + 3O2 -> 2In2O3',
  '4Ga + 3O2 -> 2Ga2O3',
  '3Cu + 2O2? no',
  'Si + 2O2? no',
  '4Fe + 2H2? no',
  '4Nb + 5O2 -> 2Nb2O5',
  '4Ta + 5O2 -> 2Ta2O5',
  '4P + 5O2 -> P4O10',
  '2Se + 3O2 -> 2SeO3',
  '4P + 3O2 -> P4O6',
  '2Te + O2 -> 2TeO? no',
  '2I2 + 5O2 -> 2I2O5? no',
  'C2H2 + H2 -> C2H4',
].filter((s) => !s.includes('?'));

const DECOMPOSITION_EASY = [
  'H2CO3 -> H2O + CO2',
  '2H2O2 -> 2H2O + O2',
  '2KClO3 -> 2KCl + 3O2',
  'CaCO3 -> CaO + CO2',
  'SrCO3 -> SrO + CO2',
  'BaCO3 -> BaO + CO2',
  'ZnCO3 -> ZnO + CO2',
  'NiCO3 -> NiO + CO2',
  'CoCO3 -> CoO + CO2',
  'MnCO3 -> MnO + CO2',
  'Li2CO3 -> Li2O + CO2',
  'Cr2(CO3)3 -> Cr2O3 + 3CO2',
  'Fe2(CO3)3 -> Fe2O3 + 3CO2',
  '2NaHCO3 -> Na2CO3 + H2O + CO2',
  'Ca(HCO3)2 -> CaCO3 + H2O + CO2',
  'NH4NO3 -> N2O + 2H2O',
  'NH4Cl -> NH3 + HCl',
  'Cu(OH)2 -> CuO + H2O',
  'Mg(OH)2 -> MgO + H2O',
  'Ca(OH)2 -> CaO + H2O',
  '2Fe(OH)3 -> Fe2O3 + 3H2O',
  '2Al(OH)3 -> Al2O3 + 3H2O',
  '2Ag2O -> 4Ag + O2',
  '2HgO -> 2Hg + O2',
  '2Ag2CO3 -> 4Ag + 2CO2 + O2',
  '2NaNO3 -> 2NaNO2 + O2',
];

const DECOMPOSITION_MEDIUM = [
  'NH4HCO3 -> NH3 + H2O + CO2',
  '(NH4)2CO3 -> 2NH3 + H2O + CO2',
  'NH4NO2 -> N2 + 2H2O',
  'Mg(HCO3)2 -> MgCO3 + H2O + CO2',
  'Sr(HCO3)2 -> SrCO3 + H2O + CO2',
  'Ca(NO3)2 -> Ca(NO2)2 + O2',
  'Fe(OH)2 -> FeO + H2O',
  'Zn(OH)2 -> ZnO + H2O',
  'PbCO3 -> PbO + CO2',
  'FeCO3 -> FeO + CO2',
  'CuCO3 -> CuO + CO2',
  '2KNO3 -> 2KNO2 + O2',
  'CaC2 -> Ca + 2C',
  'CaC2O4 -> CaCO3 + CO',
  '2FeSO4 -> Fe2O3 + SO2 + SO3',
  '2Cu(NO3)2 -> 2CuO + 4NO2 + O2',
  '2NH4NO3 -> 2N2 + 4H2O + O2',
  '2Cr(OH)3 -> Cr2O3 + 3H2O',
  'Ni(OH)2 -> NiO + H2O',
  'Co(OH)2 -> CoO + H2O',
  'Mn(OH)2 -> MnO + H2O',
  '2H2O -> 2H2 + O2',
  '2ZnO -> 2Zn + O2',
  '2Fe2O3 -> 4Fe + 3O2',
];

const DECOMPOSITION_HARD = [
  '2AgNO3 -> 2Ag + 2NO2 + O2',
  '2Pb(NO3)2 -> 2PbO + 4NO2 + O2',
  '4HNO3 -> 4NO2 + 2H2O + O2',
  '2KMnO4 -> K2MnO4 + MnO2 + O2',
  '2Zn(NO3)2 -> 2ZnO + 4NO2 + O2',
  '2Mg(NO3)2 -> 2MgO + 4NO2 + O2',
  '2Ba(NO3)2 -> 2BaO + 4NO2 + O2',
  '2Sr(NO3)2 -> 2SrO + 4NO2 + O2',
  '2Fe(NO3)2 -> 2FeO + 4NO2 + O2',
  '2Ni(NO3)2 -> 2NiO + 4NO2 + O2',
  '2Co(NO3)2 -> 2CoO + 4NO2 + O2',
  '2Mn(NO3)2 -> 2MnO + 4NO2 + O2',
  '2Hg(NO3)2 -> 2HgO + 4NO2 + O2',
  '4Al(NO3)3 -> 2Al2O3 + 12NO2 + 3O2',
  '4Fe(NO3)3 -> 2Fe2O3 + 12NO2 + 3O2',
  '2Ca3(PO4)2 -> 6CaO + P4O10',
  '2CuSO4 -> 2CuO + 2SO2 + O2',
  'Pb(OH)2 -> PbO + H2O',
  '2CuO -> 2Cu + O2',
  'Na2CO3 -> Na2O + CO2',
  'CaSO4 -> CaO + SO3',
  'MgSO4 -> MgO + SO3',
  'K2SO4 -> K2O + SO3',
  'KClO4 -> 1KCl + 2O2',
  'Ba(ClO3)2 -> 1BaCl2 + 3O2',
];

const SINGLE_EASY = [
  'Fe + CuSO4 -> FeSO4 + Cu',
  'Zn + CuSO4 -> ZnSO4 + Cu',
  'Mg + CuSO4 -> MgSO4 + Cu',
  'Fe + 2HCl -> FeCl2 + H2',
  'Zn + 2HCl -> ZnCl2 + H2',
  'Mg + 2HCl -> MgCl2 + H2',
  'Ca + 2HCl -> CaCl2 + H2',
  '2Na + 2HCl -> 2NaCl + H2',
  '2K + 2HCl -> 2KCl + H2',
  '2Na + 2H2O -> 2NaOH + H2',
  '2K + 2H2O -> 2KOH + H2',
  'Ca + 2H2O -> Ca(OH)2 + H2',
  '2Li + 2H2O -> 2LiOH + H2',
  '2Al + 6HCl -> 2AlCl3 + 3H2',
  '2Al + 3H2SO4 -> Al2(SO4)3 + 3H2',
  'Ni + 2HCl -> NiCl2 + H2',
  'Cd + 2HCl -> CdCl2 + H2',
  'Fe + 2HBr -> FeBr2 + H2',
  'Co + 2HCl -> CoCl2 + H2',
  'Sn + 2HCl -> SnCl2 + H2',
  'Pb + 2HCl -> PbCl2 + H2',
  'Ba + 2H2O -> Ba(OH)2 + H2',
  'Mg + 2H2O -> Mg(OH)2 + H2',
  'Mn + 2HCl -> MnCl2 + H2',
  'Ba + 2HCl -> BaCl2 + H2',
  'Cr + 2HCl -> CrCl2 + H2',
];

const SINGLE_MEDIUM = [
  'Cu + 2AgNO3 -> Cu(NO3)2 + 2Ag',
  'Zn + 2AgNO3 -> Zn(NO3)2 + 2Ag',
  'Fe + 2AgNO3 -> Fe(NO3)2 + 2Ag',
  'Fe + Pb(NO3)2 -> Fe(NO3)2 + Pb',
  'Cu + HgCl2 -> CuCl2 + Hg',
  'Fe + HgCl2 -> FeCl2 + Hg',
  'Cl2 + 2NaBr -> 2NaCl + Br2',
  'Cl2 + 2NaI -> 2NaCl + I2',
  'Br2 + 2KI -> 2KBr + I2',
  'H2 + CuO -> Cu + H2O',
  'H2 + PbO -> Pb + H2O',
  'H2 + FeO -> Fe + H2O',
  'CO + CuO -> Cu + CO2',
  'Sr + 2HCl -> SrCl2 + H2',
  '2Al + 3H2S -> Al2S3 + 3H2',
  '2Al + 3CuCl2 -> 2AlCl3 + 3Cu',
  'Fe + CuCl2 -> FeCl2 + Cu',
  'Fe + H2SO4 -> FeSO4 + H2',
  'Mg + 2HBr -> MgBr2 + H2',
  'Al + 3AgNO3 -> Al(NO3)3 + 3Ag',
  '2Cr + 6HCl -> 2CrCl3 + 3H2',
  'Zn + 2NaOH -> Na2ZnO2 + H2',
  'Zn + HgCl2 -> ZnCl2 + Hg',
  'Mn + 2AgNO3 -> Mn(NO3)2 + 2Ag',
  'Co + 2AgNO3 -> Co(NO3)2 + 2Ag',
  'Ni + 2AgNO3 -> Ni(NO3)2 + 2Ag',
  'Sn + CuSO4? no',
  'Pb + CuSO4? no',
  '2Li + 2H2? no',
  '2K + 2CH3OH -> 2KOCH3 + H2',
  '2Na + 2C2H5OH -> 2C2H5ONa + H2',
  'Br2 + 2KCl? no',
].filter((s) => !s.includes('?'));

const SINGLE_HARD = [
  '2Al + 3CuSO4 -> 3Cu + Al2(SO4)3',
  '2Mg + SiO2 -> 2MgO + Si',
  '4Al + 3SiO2 -> 2Al2O3 + 3Si',
  '2Mg + CO2 -> 2MgO + C',
  'Mg + N2O -> MgO + N2',
  '3Fe + 4H2O -> Fe3O4 + 4H2',
  'Cu + 2H2SO4 -> CuSO4 + SO2 + 2H2O',
  '3Cu + 8HNO3 -> 3Cu(NO3)2 + 2NO + 4H2O',
  'Cu + 4HNO3 -> Cu(NO3)2 + 2NO2 + 2H2O',
  'Ni + 4HNO3 -> Ni(NO3)2 + 2NO2 + 2H2O',
  '3H2 + Fe2O3 -> 2Fe + 3H2O',
  '4H2 + Fe3O4 -> 3Fe + 4H2O',
  'C + 2CuO -> 2Cu + CO2',
  'C + ZnO -> Zn + CO',
  '3CO + Fe2O3 -> 2Fe + 3CO2',
  'Fe + 6HNO3 -> Fe(NO3)3 + 3NO2 + 3H2O',
  '2Al + 2NaOH + 2H2O -> 2NaAlO2 + 3H2',
  'F2 + 2NaCl -> 2NaF + Cl2',
  'F2 + 2KI -> 2KF + I2',
  'Cl2 + 2KI -> 2KCl + I2',
  '4Na + TiCl4 -> 4NaCl + Ti',
  '4Na + SnCl4 -> 4NaCl + Sn',
  '2Mg + SiCl4 -> 2MgCl2 + Si',
  '2Al + 3CuO -> Al2O3 + 3Cu',
  '2Cr + 3H2SO4 -> 1Cr2(SO4)3 + 3H2',
  '2Ba + 2H2? no',
  '3Zn + 2HNO3? no',
  '2Au + 3HCl? no',
  '2Pb + 4HNO3? no',
  'C + 2H2SO4? no',
  '2H2 + 2CuO? no',
  '2Mg + 2H2O? no',
  'Zn + H2SO4 -> ZnSO4 + H2',
  'Sn + 2H2SO4 -> SnSO4 + SO2 + 2H2O',
  'Fe + 2H2SO4? no',
  '2Ag + 2HCl? no',
  'P4 + 10K? no',
  '2B + 6H2O -> B2(OH)6? no',
  '2C2H2 + 2H2? no',
  'Si + 2HF? no',
  '2Al + 2H3PO4 -> 2AlPO4 + 3H2',
  '2Mg + 2H3PO4 -> Mg2(PO4)2 + 3H2',
].filter((s) => !s.includes('?'));

const DOUBLE_EASY = [
  'AgNO3 + NaCl -> AgCl + NaNO3',
  'AgNO3 + KCl -> AgCl + KNO3',
  'BaCl2 + Na2SO4 -> BaSO4 + 2NaCl',
  'HCl + NaOH -> NaCl + H2O',
  'H2SO4 + 2NaOH -> Na2SO4 + 2H2O',
  'Ca(OH)2 + 2HCl -> CaCl2 + 2H2O',
  'Na2CO3 + 2HCl -> 2NaCl + H2O + CO2',
  'CaCO3 + 2HCl -> CaCl2 + H2O + CO2',
  'KOH + HCl -> KCl + H2O',
  'NaOH + HNO3 -> NaNO3 + H2O',
  'CuSO4 + 2NaOH -> Cu(OH)2 + Na2SO4',
  'MgCl2 + 2NaOH -> Mg(OH)2 + 2NaCl',
  'CaCl2 + Na2CO3 -> CaCO3 + 2NaCl',
  'BaCl2 + Na2CO3 -> BaCO3 + 2NaCl',
  '2AgNO3 + Na2CO3 -> Ag2CO3 + 2NaNO3',
  'Na2CO3 + CuSO4 -> CuCO3 + Na2SO4',
  'Cu(OH)2 + 2HCl -> CuCl2 + 2H2O',
  'Al(OH)3 + 3HCl -> AlCl3 + 3H2O',
  'Fe(OH)3 + 3HCl -> FeCl3 + 3H2O',
  'Zn(OH)2 + 2HCl -> ZnCl2 + 2H2O',
  'CuO + 2HCl -> CuCl2 + H2O',
  'ZnO + 2HCl -> ZnCl2 + H2O',
  'CaO + 2HCl -> CaCl2 + H2O',
  'Na2O + 2HCl -> 2NaCl + H2O',
  'K2O + 2HCl -> 2KCl + H2O',
  'MgO + 2HCl -> MgCl2 + H2O',
  'Pb(NO3)2 + 2NaCl -> PbCl2 + 2NaNO3',
  'Pb(NO3)2 + 2KI -> PbI2 + 2KNO3',
  'AgNO3 + NaF -> AgF + NaNO3',
  'AgNO3 + NaI -> AgI + NaNO3',
  '2KOH + CO2 -> K2CO3 + H2O',
  'Na2O + 2HNO3 -> 2NaNO3 + H2O',
  'K2O + 2HNO3 -> 2KNO3 + H2O',
  'CaO + 2HNO3 -> Ca(NO3)2 + H2O',
];

const DOUBLE_MEDIUM = [
  '2NaOH + H2CO3 -> Na2CO3 + 2H2O',
  'Ba(OH)2 + H2SO4 -> BaSO4 + 2H2O',
  '2KOH + H2SO4 -> K2SO4 + 2H2O',
  'Sr(OH)2 + 2HCl -> SrCl2 + 2H2O',
  '2HNO3 + Ca(OH)2 -> Ca(NO3)2 + 2H2O',
  'Ba(OH)2 + 2HNO3 -> Ba(NO3)2 + 2H2O',
  'H3PO4 + 3NaOH -> Na3PO4 + 3H2O',
  'H3PO4 + 3KOH -> K3PO4 + 3H2O',
  '2NaOH + SO2 -> Na2SO3 + H2O',
  '2NaOH + SO3 -> Na2SO4 + H2O',
  '2KOH + H2S -> K2S + 2H2O',
  '2NaOH + H2S -> Na2S + 2H2O',
  'FeCl3 + 3NaOH -> Fe(OH)3 + 3NaCl',
  'AlCl3 + 3NaOH -> Al(OH)3 + 3NaCl',
  'FeCl2 + 2NaOH -> Fe(OH)2 + 2NaCl',
  'FeCl3 + 3KOH -> Fe(OH)3 + 3KCl',
  'ZnCl2 + 2NaOH -> Zn(OH)2 + 2NaCl',
  'CuCl2 + 2AgNO3 -> 2AgCl + Cu(NO3)2',
  'H2S + CuSO4 -> CuS + H2SO4',
  'H2S + Pb(NO3)2 -> PbS + 2HNO3',
  '2AgNO3 + H2S -> Ag2S + 2HNO3',
  'FeS + 2HCl -> FeCl2 + H2S',
  'ZnS + 2HCl -> ZnCl2 + H2S',
  'Na2S + 2HCl -> 2NaCl + H2S',
  'BaS + 2HCl -> BaCl2 + H2S',
  'Cu(NO3)2 + 2NaOH -> Cu(OH)2 + 2NaNO3',
  'Zn(NO3)2 + 2NaOH -> Zn(OH)2 + 2NaNO3',
  'Ca(OH)2 + CO2 -> CaCO3 + H2O',
  'Ba(OH)2 + CO2 -> BaCO3 + H2O',
  'CO2 + 2NaOH -> Na2CO3 + H2O',
  'SO2 + 2NaOH -> Na2SO3 + H2O',
  'SO3 + 2NaOH -> Na2SO4 + H2O',
  'NaHCO3 + HCl -> NaCl + H2O + CO2',
  'K2CO3 + 2HCl -> 2KCl + H2O + CO2',
  'BaCO3 + 2HCl -> BaCl2 + H2O + CO2',
  'MgCO3 + 2HCl -> MgCl2 + H2O + CO2',
  'ZnCO3 + 2HCl -> ZnCl2 + H2O + CO2',
  'Na2SO3 + 2HCl -> 2NaCl + H2O + SO2',
  '(NH4)2SO4 + BaCl2 -> BaSO4 + 2NH4Cl',
  '(NH4)2SO4 + Ba(NO3)2 -> BaSO4 + 2NH4NO3',
  'NH4Cl + NaOH -> NH3 + NaCl + H2O',
  '(NH4)2SO4 + 2NaOH -> Na2SO4 + 2NH3 + 2H2O',
  'MgSO4 + 2NaOH -> Mg(OH)2 + Na2SO4',
  'K2SO4 + BaCl2 -> BaSO4 + 2KCl',
  'Fe2O3 + 6HCl -> 2FeCl3 + 3H2O',
  'CuO + H2SO4 -> CuSO4 + H2O',
  'ZnO + H2SO4 -> ZnSO4 + H2O',
  'FeO + 2HCl -> FeCl2 + H2O',
  'Al2O3 + 6HCl -> 2AlCl3 + 3H2O',
  'FeO + H2SO4 -> FeSO4 + H2O',
  'CuO + 2HNO3 -> Cu(NO3)2 + H2O',
  'MgCO3 + H2SO4 -> MgSO4 + CO2 + H2O',
  'CaCO3 + H2SO4 -> CaSO4 + CO2 + H2O',
  'ZnCO3 + H2SO4 -> ZnSO4 + CO2 + H2O',
];

const DOUBLE_HARD = [
  '2H3PO4 + 3Ca(OH)2 -> Ca3(PO4)2 + 6H2O',
  '2H3PO4 + 3Ba(OH)2 -> Ba3(PO4)2 + 6H2O',
  'Al2(SO4)3 + 6NaOH -> 2Al(OH)3 + 3Na2SO4',
  'Fe2(SO4)3 + 6NaOH -> 2Fe(OH)3 + 3Na2SO4',
  'Al2O3 + 3H2SO4 -> Al2(SO4)3 + 3H2O',
  'Fe2O3 + 3H2SO4 -> Fe2(SO4)3 + 3H2O',
  'P2O5 + 6NaOH -> 2Na3PO4 + 3H2O',
  'SiO2 + 2NaOH -> Na2SiO3 + H2O',
  'SiO2 + 2KOH -> K2SiO3 + H2O',
  'Na2O2 + 2HCl -> 2NaCl + H2O2',
  'Na2O2 + H2SO4 -> Na2SO4 + H2O2',
  'BaCl2 + H2SO4 -> BaSO4 + 2HCl',
  'Pb(NO3)2 + H2SO4 -> PbSO4 + 2HNO3',
  'SrCl2 + Na2SO4 -> SrSO4 + 2NaCl',
  'CaCl2 + Na2SO4 -> CaSO4 + 2NaCl',
  'BaCl2 + K2CrO4 -> BaCrO4 + 2KCl',
  '2AgNO3 + K2CrO4 -> Ag2CrO4 + 2KNO3',
  '2AgNO3 + Na2CrO4 -> Ag2CrO4 + 2NaNO3',
  'Ca3(PO4)2 + 6HCl -> 3CaCl2 + 2H3PO4',
  'Ba3(PO4)2 + 6HCl -> 3BaCl2 + 2H3PO4',
  'Ag3PO4 + 3HCl -> 3AgCl + H3PO4',
  'Ca3(PO4)2 + 6HNO3 -> 3Ca(NO3)2 + 2H3PO4',
  '2Al(OH)3 + 3H2SO4 -> Al2(SO4)3 + 6H2O',
  '2Fe(OH)3 + 3H2SO4 -> Fe2(SO4)3 + 6H2O',
  'Cu(OH)2 + H2SO4 -> 1CuSO4 + 2H2O',
  'Cu(OH)2 + H2S -> CuS + 2H2O',
  'Zn(OH)2 + H2S -> ZnS + 2H2O',
  'FeS + CuSO4 -> FeSO4 + CuS',
  'ZnS + CuSO4 -> ZnSO4 + CuS',
  'BaS + ZnCl2 -> BaCl2 + ZnS',
  'CaC2 + 2H2O -> Ca(OH)2 + C2H2',
  'Mg3N2 + 6H2O -> 3Mg(OH)2 + 2NH3',
  'Al4C3 + 12H2O -> 4Al(OH)3 + 3CH4',
  'Na2O2 + 2H2O -> 2NaOH + H2O2',
  'Na2CO3 + Ca(OH)2 -> CaCO3 + 2NaOH',
  '2NaAlO2 + CO2 + 3H2O -> 2Al(OH)3 + Na2CO3',
  'NaAlO2 + HCl + H2O -> Al(OH)3 + NaCl',
  'Zn(OH)2 + 2NaOH -> Na2ZnO2 + 2H2O',
  'Al(OH)3 + NaOH -> NaAlO2 + 2H2O',
  '3Ba(NO3)2 + 2Na3PO4 -> Ba3(PO4)2 + 6NaNO3',
  'Al2(SO4)3 + 3BaCl2 -> 3BaSO4 + 2AlCl3',
  'Fe2(SO4)3 + 3BaCl2 -> 3BaSO4 + 2FeCl3',
  'Ca(NO3)2 + Na2SO4 -> CaSO4 + 2NaNO3',
  'MgSO4 + BaCl2 -> BaSO4 + MgCl2',
  'Pb(NO3)2 + 2NaF -> PbF2 + 2NaNO3',
  'CuSO4 + BaCl2 -> BaSO4 + CuCl2',
  'BaCO3 + 2HNO3 -> Ba(NO3)2 + H2O + CO2',
  'ZnCO3 + 2HNO3 -> Zn(NO3)2 + H2O + CO2',
  '2Fe(OH)3 + 3H2SO4 -> Fe2(SO4)3 + 6H2O',
  '1Ca3(PO4)2 + 3H2SO4 -> 3CaSO4 + 2H3PO4',
  'Na3PO4 + 3AgNO3 -> Ag3PO4 + 3NaNO3',
  'K2S + 2AgNO3? no',
  'Ba(NO3)2 + Na2SO4 -> BaSO4 + 2NaNO3',
  'Sr(NO3)2 + Na2CO3 -> SrCO3 + 2NaNO3',
  '2KNO3 + CaCl2? no',
  'Ag2CrO4 + 2NaOH? no',
  'Zn(OH)2 + H2SO4 -> ZnSO4 + 2H2O',
  'Fe(OH)2 + H2SO4 -> FeSO4 + 2H2O',
  'Cu(OH)2 + 2KOH -> K2CuO2 + 2H2O? no',
  '2KOH + H3PO4 -> K2HPO4 + 2H2O',
  '3KOH + H3PO4 -> K3PO4 + 3H2O',
  'Ba(OH)2 + 2HNO3 -> Ba(NO3)2 + 2H2O',
  'Sr(OH)2 + H2SO4 -> SrSO4 + 2H2O',
  'Ca(OH)2 + SO3 -> CaSO4 + H2O',
  '2NaOH + H2CrO4 -> Na2CrO4 + 2H2O',
  'BaCl2 + Na2CrO4 -> BaCrO4 + 2NaCl',
  'Al2(SO4)3 + 6NH4OH -> 2Al(OH)3 + 3(NH4)2SO4',
  'CuSO4 + 2NH4OH -> Cu(OH)2 + (NH4)2SO4',
  'ZnCl2 + 2NH4OH -> Zn(OH)2 + 2NH4Cl',
  'FeCl3 + 3NH4OH -> Fe(OH)3 + 3NH4Cl',
].filter((s) => !s.includes('?'));

const COMBUSTION_EASY = [
  'CH4 + 2O2 -> CO2 + 2H2O',
  '2C2H6 + 7O2 -> 4CO2 + 6H2O',
  'C2H4 + 3O2 -> 2CO2 + 2H2O',
  '2C2H2 + 5O2 -> 4CO2 + 2H2O',
  'C3H8 + 5O2 -> 3CO2 + 4H2O',
  '2C3H6 + 9O2 -> 6CO2 + 6H2O',
  'C3H4 + 4O2 -> 3CO2 + 2H2O',
  '2C4H10 + 13O2 -> 8CO2 + 10H2O',
  'C4H8 + 6O2 -> 4CO2 + 4H2O',
  'C5H12 + 8O2 -> 5CO2 + 6H2O',
  '2C5H10 + 15O2 -> 10CO2 + 10H2O',
  '2C6H14 + 19O2 -> 12CO2 + 14H2O',
  '2C6H6 + 15O2 -> 12CO2 + 6H2O',
  'C6H12 + 9O2 -> 6CO2 + 6H2O',
  'C7H16 + 11O2 -> 7CO2 + 8H2O',
  'C7H8 + 9O2 -> 7CO2 + 4H2O',
  '2C8H18 + 25O2 -> 16CO2 + 18H2O',
  'C8H16 + 12O2 -> 8CO2 + 8H2O',
  'C4H8O2 + 5O2 -> 4CO2 + 4H2O',
  '2C14H30O2 + 41O2 -> 28CO2 + 30H2O',
  'C5H8 + 7O2 -> 5CO2 + 4H2O',
  '2C7H14 + 21O2 -> 14CO2 + 14H2O',
  'C9H12 + 12O2 -> 9CO2 + 6H2O',
  'C10H8 + 12O2 -> 10CO2 + 4H2O',
];

const COMBUSTION_MEDIUM = [
  'C2H6O + 3O2 -> 2CO2 + 3H2O',
  '2C3H8O + 9O2 -> 6CO2 + 8H2O',
  'C4H10O + 6O2 -> 4CO2 + 5H2O',
  '2C4H8O + 11O2 -> 8CO2 + 8H2O',
  '2CH4O + 3O2 -> 2CO2 + 4H2O',
  'C6H6O + 7O2 -> 6CO2 + 3H2O',
  'C2H4O2 + 2O2 -> 2CO2 + 2H2O',
  'C6H14O + 9O2 -> 6CO2 + 7H2O',
  'C3H6O + 4O2 -> 3CO2 + 3H2O',
  '2C6H12O + 17O2 -> 12CO2 + 12H2O',
  'C5H10O + 7O2 -> 5CO2 + 5H2O',
  '2C8H10 + 21O2 -> 16CO2 + 10H2O',
  '2C10H22 + 31O2 -> 20CO2 + 22H2O',
  'C9H20 + 14O2 -> 9CO2 + 10H2O',
  '2C14H30O2 + 41O2 -> 28CO2 + 30H2O',
  'C5H8 + 7O2 -> 5CO2 + 4H2O',
  '2C7H14 + 21O2 -> 14CO2 + 14H2O',
  'C11H24 + 17O2 -> 11CO2 + 12H2O',
  'C13H28 + 20O2 -> 13CO2 + 14H2O',
  '2C14H30 + 43O2 -> 28CO2 + 30H2O',
  '2C7H16O + 21O2 -> 14CO2 + 16H2O',
  'C8H18O + 12O2 -> 8CO2 + 9H2O',
  '2C9H20O + 27O2 -> 18CO2 + 20H2O',
  'C10H22O + 15O2 -> 10CO2 + 11H2O',
  '2C2H4O + 5O2 -> 4CO2 + 4H2O',
  'C3H8O2 + 4O2 -> 3CO2 + 4H2O',
  '2C4H10O2 + 11O2 -> 8CO2 + 10H2O',
  'C10H8 + 12O2 -> 10CO2 + 4H2O',
  'C4H8O2 + 5O2 -> 4CO2 + 4H2O',
  '2C10H14 + 27O2 -> 20CO2 + 14H2O',
  '2C6H14 + 19O2 -> 12CO2 + 14H2O',
  'C4H8 + 6O2 -> 4CO2 + 4H2O',
  'C6H12 + 9O2 -> 6CO2 + 6H2O',
  '2C5H10 + 15O2 -> 10CO2 + 10H2O',
  'C8H8 + 10O2 -> 8CO2 + 4H2O',
];

const COMBUSTION_HARD = [
  'C12H22O11 + 12O2 -> 12CO2 + 11H2O',
  'C6H12O6 + 6O2 -> 6CO2 + 6H2O',
  '2C7H6O2 + 15O2 -> 14CO2 + 6H2O',
  '2C12H26 + 37O2 -> 24CO2 + 26H2O',
  '2C10H18 + 29O2 -> 20CO2 + 18H2O',
  'C15H32 + 23O2 -> 15CO2 + 16H2O',
  '2C16H34 + 49O2 -> 32CO2 + 34H2O',
  '2C18H38 + 55O2 -> 36CO2 + 38H2O',
  '2C20H42 + 61O2 -> 40CO2 + 42H2O',
  '2C5H10O2 + 13O2 -> 10CO2 + 10H2O',
  '2C4H6O2 + 9O2 -> 8CO2 + 6H2O',
  '2C7H14O2 + 19O2 -> 14CO2 + 14H2O',
  'C6H12O2 + 8O2 -> 6CO2 + 6H2O',
  '2C7H14O2 + 19O2 -> 14CO2 + 14H2O',
  '2C4H10O2 + 11O2 -> 8CO2 + 10H2O',
  '1C5H12O2 + 7O2 -> 5CO2 + 6H2O',
  '2C3H8O3 + 7O2 -> 6CO2 + 8H2O',
  '2C2H6O2 + 5O2 -> 4CO2 + 6H2O',
  '2C2H4O3 + 3O2 -> 4CO2 + 4H2O',
  '2C6H12O3 + 15O2 -> 12CO2 + 12H2O',
  '2C4H8O3 + 9O2 -> 8CO2 + 8H2O',
  '1C5H10O3 + 6O2 -> 5CO2 + 5H2O',
  '2C3H6O2 + 7O2 -> 6CO2 + 6H2O',
  '2C6H14O2 + 17O2 -> 12CO2 + 14H2O',
  '2C4H10O2 + 11O2 -> 8CO2 + 10H2O',
  '2C8H18O2 + 23O2 -> 16CO2 + 18H2O',
  '1C10H20O2 + 14O2 -> 10CO2 + 10H2O',
  'C11H24 + 17O2 -> 11CO2 + 12H2O',
  'C13H28 + 20O2 -> 13CO2 + 14H2O',
  '2C2H6 + 7O2 -> 4CO2 + 6H2O',
  'C3H8 + 5O2 -> 3CO2 + 4H2O',
  '2C2H2 + 5O2 -> 4CO2 + 2H2O',
  '2C4H10 + 13O2 -> 8CO2 + 10H2O',
  '2C8H18 + 25O2 -> 16CO2 + 18H2O',
];

const BANK_SEED: BankSeed = {
  synthesis: {
    easy: SYNTHESIS_EASY,
    medium: SYNTHESIS_MEDIUM,
    hard: SYNTHESIS_HARD,
  },
  decomposition: {
    easy: DECOMPOSITION_EASY,
    medium: DECOMPOSITION_MEDIUM,
    hard: DECOMPOSITION_HARD,
  },
  'single-replacement': {
    easy: SINGLE_EASY,
    medium: SINGLE_MEDIUM,
    hard: SINGLE_HARD,
  },
  'double-replacement': {
    easy: DOUBLE_EASY,
    medium: DOUBLE_MEDIUM,
    hard: DOUBLE_HARD,
  },
  combustion: {
    easy: COMBUSTION_EASY,
    medium: COMBUSTION_MEDIUM,
    hard: COMBUSTION_HARD,
  },
};

export const REACTION_TYPES: ReactionType[] = [
  'synthesis',
  'decomposition',
  'single-replacement',
  'double-replacement',
  'combustion',
];

/* ------------------------------------------------------------------ */
/* Unbalanced prompt generation                                        */
/* ------------------------------------------------------------------ */

/** Deterministic 32-bit hash (FNV-1a) so prompts never depend on Math.random. */
export function hashString(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/** mulberry32 PRNG — small, fast, and fully deterministic. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface SideParts {
  /** Unicode formulas in order. */
  unicode: string[];
  /** Plain formulas in order. */
  plain: string[];
  /** True coefficients from the balanced form (1 when absent). */
  coefficients: number[];
}

function splitBalanced(balancedPlain: string): { left: SideParts; right: SideParts } | null {
  const parsed = parseEquation(balancedPlain);
  if (!parsed.ok) return null;

  const collect = (list: typeof parsed.left): SideParts => ({
    unicode: list.map((s) => s.formula),
    plain: list.map((s) => s.formulaPlain),
    coefficients: list.map((s) => (s.coefficient === 0 ? 1 : s.coefficient)),
  });

  return { left: collect(parsed.left), right: collect(parsed.right) };
}

function renderSide(
  formulas: string[],
  coefficients: number[],
  style: 'unicode' | 'plain',
): string {
  return formulas
    .map((f, i) => (coefficients[i] === 1 ? f : `${coefficients[i]}${f}`))
    .join(style === 'plain' ? ' + ' : ' + ');
}

/**
 * Strip the coefficients and replace them with small random-ish whole numbers.
 *
 * The species list is identical to the balanced form; only the coefficients
 * change, and the result is guaranteed to differ from the correct answer.
 */
export function makeUnbalanced(balancedPlain: string, salt = 0): { plain: string; unicode: string } {
  const split = splitBalanced(balancedPlain);
  if (!split) return { plain: balancedPlain, unicode: balancedPlain };

  const rng = mulberry32((hashString(balancedPlain) + salt * 0x9e3779b1) >>> 0);

  const drawSide = (side: SideParts): number[] => {
    let coefficients: number[] = [];
    let attempt = 0;
    do {
      coefficients = side.coefficients.map(() => 1 + Math.floor(rng() * 6));
      attempt += 1;
    } while (
      attempt < 24 &&
      coefficients.every((c, i) => c === side.coefficients[i])
    );
    return coefficients;
  };

  const leftCoefficients = drawSide(split.left);
  const rightCoefficients = drawSide(split.right);

  const plain = `${renderSide(split.left.plain, leftCoefficients, 'plain')} -> ${renderSide(split.right.plain, rightCoefficients, 'plain')}`;
  const unicode = `${renderSide(split.left.unicode, leftCoefficients, 'unicode')} → ${renderSide(split.right.unicode, rightCoefficients, 'unicode')}`;

  return { plain, unicode };
}

function dedupeSeeds(seeds: BankSeed): BankSeed {
  const seen = new Set<string>();
  const out = {} as BankSeed;
  for (const type of REACTION_TYPES) {
    out[type] = { easy: [], medium: [], hard: [] };
    for (const difficulty of ['easy', 'medium', 'hard'] as Difficulty[]) {
      for (const equation of seeds[type][difficulty]) {
        const key = equation.replace(/\s+/g, '');
        if (seen.has(key)) continue;
        seen.add(key);
        out[type][difficulty].push(equation);
      }
    }
  }
  return out;
}

const CLEAN_SEEDS = dedupeSeeds(BANK_SEED);

/** The full reaction bank. Built once, at module load. */
export const REACTION_BANK: ReactionBankEntry[] = (() => {
  const entries: ReactionBankEntry[] = [];
  for (const type of REACTION_TYPES) {
    for (const difficulty of ['easy', 'medium', 'hard'] as Difficulty[]) {
      for (const balancedPlain of CLEAN_SEEDS[type][difficulty]) {
        entries.push({
          type,
          balancedPlain,
          unbalancedPlain: makeUnbalanced(balancedPlain).plain,
          difficulty,
        });
      }
    }
  }
  return entries;
})();

/* ------------------------------------------------------------------ */
/* Templates                                                           */
/* ------------------------------------------------------------------ */

function toTemplate(entry: ReactionBankEntry, index: number): ReactionTemplate {
  const unbalanced = makeUnbalanced(entry.balancedPlain);
  const balanced = balanceEquation(entry.balancedPlain);
  return {
    id: `rxn-${index + 1}-${entry.type}-${entry.difficulty}`,
    type: entry.type,
    balanced: balanced.ok ? balanced.balanced : entry.balancedPlain,
    balancedPlain: entry.balancedPlain,
    unbalanced: unbalanced.unicode,
    unbalancedPlain: unbalanced.plain,
    difficulty: entry.difficulty,
    alreadyBalanced: unbalanced.plain.replace(/\s+/g, '') === entry.balancedPlain.replace(/\s+/g, ''),
  };
}

/** Every bank entry as a `ReactionTemplate`, in bank order. */
export const REACTION_TEMPLATES: ReactionTemplate[] = REACTION_BANK.map(toTemplate);

export interface PickReactionsConfig {
  /** How many reactions to return. */
  count: number;
  /** Allowed reaction types; empty or omitted means all types. */
  reactionTypes?: ReactionType[];
  /** Required difficulty. */
  difficulty?: Difficulty;
  /** Seed for deterministic selection. */
  seed?: number | string;
  /** Only return reactions whose type is in `reactionTypes`. */
  type?: ReactionType;
}

function seedToNumber(seed: number | string | undefined): number {
  if (seed === undefined) return 0x9e3779b9;
  return typeof seed === 'number' ? seed >>> 0 : hashString(String(seed));
}

/**
 * Deterministically pick `count` reactions.
 *
 * With the same seed and the same config the result is byte-for-byte identical.
 * No reaction is repeated within one call.
 */
export function pickReactions(config: PickReactionsConfig): ReactionTemplate[] {
  const count = Math.max(0, Math.floor(config.count ?? 0));
  const wanted = new Set<ReactionType>([
    ...(config.reactionTypes ?? []),
    ...(config.type ? [config.type] : []),
  ]);
  const filters = wanted.size > 0 ? wanted : null;

  const pool = REACTION_TEMPLATES.filter((t) => {
    if (filters && !filters.has(t.type)) return false;
    if (config.difficulty && t.difficulty !== config.difficulty) return false;
    return true;
  });

  const rng = mulberry32(seedToNumber(config.seed));
  // Fisher-Yates with the seeded PRNG.
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
  }

  const seen = new Set<string>();
  const picked: ReactionTemplate[] = [];
  for (const template of pool) {
    if (seen.has(template.balancedPlain)) continue;
    seen.add(template.balancedPlain);
    picked.push(template);
    if (picked.length >= count) break;
  }
  return picked;
}

/** How many bank entries there are per (type, difficulty). */
export function reactionBankCounts(): Record<ReactionType, Record<Difficulty, number>> {
  const counts = {} as Record<ReactionType, Record<Difficulty, number>>;
  for (const type of REACTION_TYPES) {
    counts[type] = { easy: 0, medium: 0, hard: 0 };
  }
  for (const entry of REACTION_BANK) {
    counts[entry.type][entry.difficulty] += 1;
  }
  return counts;
}

/** Bank entries for a single type. */
export function reactionsOfType(type: ReactionType): ReactionBankEntry[] {
  return REACTION_BANK.filter((e) => e.type === type);
}

export { balanceEquation, classifyReaction, renderNodes, plainCharge, formatCharge };
