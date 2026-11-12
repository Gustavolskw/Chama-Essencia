package com.chamaessencia.sale;

import java.util.List;

import org.springframework.data.mongodb.repository.MongoRepository;

public interface SaleRepository extends MongoRepository<Sale, String> {

    List<Sale> findByItemsBatchId(String batchId);

    boolean existsByItemsBatchId(String batchId);
}
