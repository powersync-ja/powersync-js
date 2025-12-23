import { Link } from "@tanstack/react-router";
import moment from "moment";

export default function NoteCard({
  id,
  title,
  createdAt,
}: {
  id: string;
  title: string;
  createdAt: string;
}) {
  return (
    <Link to="/note" search={{ id }} className="flex justify-between">
      <h5>{title}</h5>
      <p className="text-sm text-foreground/70">
        {moment(createdAt).fromNow()}
      </p>
    </Link>
  );
}
