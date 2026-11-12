package com.chamaessencia.stock;

import java.util.List;

import org.springframework.data.mongodb.repository.MongoRepository;

public interface PurchaseRepository extends MongoRepository<Purchase, String> {

    List<Purchase> findByMaterialId(String materialId);

    boolean existsByMaterialId(String materialId);
}
