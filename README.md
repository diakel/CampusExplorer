# Campus Explorer

Welcome to our project! This is an interface for adding and querying datasets of university course rooms and sections.

For info regarding use of the frontend, please visit the readme at /frontend/readme.md.

To use, make sure git and yarn are installed in your IDE, then run `yarn install`.

The server supports REST commands of the forms described below.

1. `PUT /dataset/:id/:kind` where id is the of a dataset being added, and kind is specifying a "rooms" or "sections" dataset. Details of supported datasets are described in the specification this project implements: https://sites.google.com/view/ubccpsc310-23w2/project/room-specification
2. `DELETE /dataset/:id` deletes a dataset with corresponding id
3. `POST /query` sends a JSON query to the server and returns the transformed data. Details of valid queries are described in the above specification.
4. `GET /datasets` returns all dataset names

