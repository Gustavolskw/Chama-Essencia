package com.chamaessencia.production;

import org.springframework.data.mongodb.repository.MongoRepository;

public interface ProductionBatchRepository extends MongoRepository<ProductionBatch, String> {
}
