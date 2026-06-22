import Card from "./Card";

type PageLoadingProps = {
  message?: string;
};

export default function PageLoading({ message = "جارٍ التحميل..." }: PageLoadingProps) {
  return (
    <Card wide>
      <p className="hint">{message}</p>
    </Card>
  );
}
