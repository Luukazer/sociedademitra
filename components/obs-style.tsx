// Deixa o fundo transparente já no HTML renderizado pelo servidor (sem "piscar" escuro no OBS).
export default function ObsStyle() {
  return <style dangerouslySetInnerHTML={{ __html: "html,body{background:transparent!important;margin:0;padding:0;overflow:hidden}" }} />;
}
