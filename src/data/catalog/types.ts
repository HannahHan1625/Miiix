export type UUID = string;
export type ISODateTime = string;

export type ReviewStatus = "pending" | "approved" | "rejected";
export type IngredientStatus = "draft" | "active" | "archived";
export type IngredientKind = "raw" | "processed" | "condiment" | "beverage" | "dish_component";
export type UnitDimension = "count" | "mass" | "volume" | "package";
export type AmountMode = UnitDimension;

export type CatalogSource = {
  id: UUID;
  provider: string;
  datasetName: string;
  version: string;
  sourceUrl: string;
  license: string;
  jurisdiction: string;
  retrievedAt: ISODateTime;
  reviewedAt: ISODateTime;
  reviewStatus: ReviewStatus;
  notes: string | null;
};

export type CatalogUnit = {
  id: UUID;
  code: string;
  nameZh: string;
  nameEn: string | null;
  dimension: UnitDimension;
  baseFactor: number | null;
};

export type CatalogStorageMethod = {
  id: UUID;
  code: string;
  nameZh: string;
  nameEn: string | null;
  temperatureMinC: number | null;
  temperatureMaxC: number | null;
  environmentTags: string[];
  requiresDark: boolean;
  requiresDry: boolean;
};

export type CatalogCategory = {
  id: UUID;
  parentId: UUID | null;
  slug: string;
  nameZh: string;
  nameEn: string | null;
  level: 1 | 2 | 3;
  sortOrder: number;
  dataVersion: string;
};

export type CatalogAlias = {
  id: UUID;
  ingredientId: UUID;
  alias: string;
  normalizedAlias: string;
  aliasType: "common" | "regional" | "retail" | "ocr" | "translation" | "external_model" | "recipe_phrase";
  locale: string;
  region: string | null;
  sourceId: UUID;
  confidence: number;
  reviewStatus: ReviewStatus;
  reviewedAt: ISODateTime;
  reviewedBy: string;
};

export type CatalogStorageProfile = {
  id: UUID;
  ingredientId: UUID;
  storageMethodId: UUID;
  region: string;
  environmentTags: string[];
  minDays: number | null;
  maxDays: number | null;
  recommendedDays: number | null;
  context: string;
  foodState: string;
  packagingState: string;
  endpoint: "quality" | "safety" | "package_label";
  instructions: string;
  sourceId: UUID;
  evidenceKey: string | null;
  confidence: number;
  reviewStatus: ReviewStatus;
  reviewedAt: ISODateTime;
  reviewedBy: string;
};

export type CatalogExternalMapping = {
  id: UUID;
  ingredientId: UUID;
  system: "USDA_SR28_NDB" | "USDA_FDC" | "FoodKeeper" | "other";
  externalId: string;
  externalName: string;
  sourceId: UUID;
  matchType: "exact" | "representative" | "broader" | "narrower";
  reviewStatus: ReviewStatus;
  reviewedAt: ISODateTime;
  reviewedBy: string;
};

export type CatalogNutritionProfile = {
  id: UUID;
  ingredientId: UUID;
  basisQuantity: number;
  basisUnitId: UUID;
  caloriesKcal: number | null;
  proteinG: number | null;
  fatG: number | null;
  carbohydrateG: number | null;
  fiberG: number | null;
  dataClassification: "analytical" | "calculated" | "estimated" | "unknown";
  foodState: string | null;
  sourceRecordId: string | null;
  sourceRelease: string | null;
  matchType: "exact" | "representative" | "broader" | "narrower" | "none";
  sourceId: UUID | null;
  externalMappingId: UUID | null;
  reviewStatus: ReviewStatus;
  reviewedAt: ISODateTime;
  reviewedBy: string;
  notes: string | null;
};

export type CatalogImageAsset = {
  id: UUID;
  ingredientId: UUID;
  assetUri: string;
  assetType: "source_photo" | "cutout" | "thumbnail";
  altText: string;
  originalUrl: string | null;
  processedUrl: string | null;
  providerAssetId: string | null;
  processingStatus: "source" | "processed" | "placeholder";
  licenseStatus: "approved" | "approved_for_prototype" | "pending" | "rejected";
  license: string;
  licenseCode: string;
  licenseUrl: string | null;
  rightsStatus: "cleared" | "pending" | "rejected";
  attribution: string | null;
  sourceUrl: string | null;
  transformLog: string[];
  sourceSha256: string | null;
  processedSha256: string | null;
  subjectMatchReviewed: boolean;
  rightsReviewed: boolean;
  styleConsistency: "prototype_placeholder" | "consistent" | "needs_review";
  aiGeneration: {
    model: string;
    prompt: string;
  } | null;
  reviewStatus: ReviewStatus;
  isPrimary: boolean;
};

export type CatalogUnitConversion = {
  id: UUID;
  fromUnitId: UUID;
  toUnitId: UUID;
  factor: number;
  sourceId: UUID;
  reviewStatus: ReviewStatus;
};

export type IngredientDetail = {
  id: UUID;
  legacyIds: string[];
  slug: string;
  canonicalNameZh: string;
  canonicalNameEn: string | null;
  scientificName: string | null;
  kind: IngredientKind;
  categoryId: UUID;
  categoryLevel1Id: UUID;
  categoryLevel2Id: UUID;
  categoryLevel3Id: UUID;
  categoryIds: UUID[];
  aliases: CatalogAlias[];
  defaultUnitId: UUID;
  supportedUnitIds: UUID[];
  defaultAmountMode: AmountMode;
  defaultPurchaseQuantity: number | null;
  unitConversions: CatalogUnitConversion[];
  defaultStorageProfileId: UUID;
  storageProfiles: CatalogStorageProfile[];
  nutritionProfile: CatalogNutritionProfile;
  referencePrice: null;
  imageAssets: CatalogImageAsset[];
  externalMappings: CatalogExternalMapping[];
  sourceIds: UUID[];
  status: IngredientStatus;
  dataVersion: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  reviewedAt: ISODateTime;
  reviewedBy: string;
};

export type IngredientCatalogDocument = {
  schemaVersion: string;
  catalogVersion: string;
  dataVersion: string;
  publishedAt: ISODateTime;
  reviewedAt: ISODateTime;
  reviewedBy: string;
  sources: CatalogSource[];
  units: CatalogUnit[];
  storageMethods: CatalogStorageMethod[];
  categories: CatalogCategory[];
  ingredients: IngredientDetail[];
};
