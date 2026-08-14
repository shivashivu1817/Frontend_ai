// Shows each tool the agent invoked while producing a response, as a
// row of "hops" — a small nod to the product's name (Relay) and to what
// is actually happening under the hood: the model relaying through tools
// before handing back a final answer.
export default function RelayTrace({ hops }) {
  if (!hops || hops.length === 0) return null;

  return (
    <div className="relay-trace">
      {hops.map((hop, i) => (
        <div key={i} className={`relay-hop ${hop.status === "done" ? "done" : ""}`}>
          <span className="dot" />
          {hop.name}
        </div>
      ))}
    </div>
  );
}
