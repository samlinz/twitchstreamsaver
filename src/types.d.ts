type VideoPageParser = {
  getVideoId: (location: Location) => string | null;
  getTime: (document: Document) => number[] | null;
  getVideoName: (document: Document) => string | null;
  getChannel: (document: Document) => string | null;
};

type ProcessVariant = {
  init: () => void;
};

type ProcessVariantBuilderProps = {
  initialUrl: string;
};
type ProcessVariantBuilder = (
  props: ProcessVariantBuilderProps
) => ProcessVariant;
