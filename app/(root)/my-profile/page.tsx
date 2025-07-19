import BookList from "@/components/BookList";
import { Button } from "@/components/ui/button";
import { sampleBooks } from "@/constants";
import { sign } from "crypto";
import { signOut } from "@/auth"
import React from "react";

const page = () => {
  return (
    <>
      <form
        className="mb-10"
        action={async () => {
          "use server";
          await signOut();
        }}
      >
        <Button>Logout</Button>
      </form>
      <BookList title="Borred Books" books={sampleBooks} />
    </>
  );
};

export default page;
