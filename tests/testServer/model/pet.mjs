import * as mongoose from "mongoose";
const Schema = mongoose.Schema;

//book schema definition
const PetSchema = new Schema(
  {
    id: {
      type: Number,
      required: true,
    },
    tag: {
      type: String,
      required: false,
    },
    name: {
      type: String,
      required: true,
    },
  },
  {
    versionKey: false,
  }
);

PetSchema.pre("save", (next) => {
  const now = new Date();
  if (!this.createdAt) {
    this.createdAt = now;
  }
  next();
});

//Exports the BookSchema for use elsewhere.
export default mongoose.model("pet", PetSchema);
