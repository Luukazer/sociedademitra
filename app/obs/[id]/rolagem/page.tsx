import ObsRoll from "@/components/obs-roll";
import ObsStyle from "@/components/obs-style";

export const dynamic = "force-dynamic";
export const metadata = { title: "OBS · Rolagem" };

export default async function ObsRollPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <ObsStyle />
      <ObsRoll sheetId={id} />
    </>
  );
}
