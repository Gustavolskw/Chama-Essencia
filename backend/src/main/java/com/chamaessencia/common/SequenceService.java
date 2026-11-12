package com.chamaessencia.common;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

/** Numeração sequencial atômica (pacote nº 1, 2, 3...; venda nº 1, 2, 3...). */
@Service
public class SequenceService {

    @Document("sequences")
    public static class Sequence {
        @Id
        private String id;
        private long value;

        public String getId() { return id; }
        public long getValue() { return value; }
    }

    private final MongoTemplate mongo;

    public SequenceService(MongoTemplate mongo) {
        this.mongo = mongo;
    }

    public long next(String name) {
        Sequence seq = mongo.findAndModify(
                Query.query(Criteria.where("_id").is(name)),
                new Update().inc("value", 1),
                FindAndModifyOptions.options().returnNew(true).upsert(true),
                Sequence.class);
        return seq == null ? 1 : seq.getValue();
    }
}
