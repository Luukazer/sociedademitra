import ObsIntegrity from "@/components/obs-integrity";
import ObsStyle from "@/components/obs-style";

export const dynamic = "force-dynamic";
export const metadata = { title: "OBS · Integridade" };

export default async function ObsIntegrityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <ObsStyle />
      <ObsIntegrity sheetId={id} />
    </>
  );
}
